import re
import uuid
import time
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction, connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import UserProfile
from credentials.models import CredentialRequest, SmsNotification
from credentials.sms import sms_available, philsms_balance
from credentials.serializers import RequestSerializer
from credentials.services import user_role, Conflict
from .models import StudentRecord, WorkItem, Preference, AuditEvent

ROLE_LABELS = {"ADMIN": "Administrator", "PRINCIPAL": "Principal", "TEACHER": "Teacher"}
SCHOOL_DEFAULTS = {
    "schoolName": "President Manuel Roxas Memorial Integrated School – South",
    "schoolId": "301905", "division": "", "schoolEmail": "", "schoolPhone": "", "address": "",
    "academicYear": "2026–2027", "timezone": "Asia/Manila (UTC+8)", "processingDays": "3 working days",
    "pickupInstructions": "Please bring a valid ID to the school records office.", "acceptRequests": True,
    "principalApproval": False, "documentVerification": True, "releaseAcknowledgment": True,
    "auditActions": True, "notifyRelease": True, "notifyNewRequest": True, "notifyApproval": True,
    "notifySecurity": True, "notifyBackup": True, "referencePrefix": "CT-[YEAR]-[5 DIGIT SEQUENCE]",
    "passwordLength": "Django password validators", "mfa": False, "lockout": "3 failures: 1 minute; 3 more: Principal unlock required",
    "sessionTimeout": "15 minutes of inactivity", "automaticBackups": False,
    "backupFrequency": "Not configured", "logRetention": "No automatic deletion",
}


def staff(request, allowed):
    role = user_role(request.user)
    if role not in allowed:
        raise PermissionDenied("Your staff role cannot perform this operation.")
    return role


def audit(request, module, action, object_id="", detail=""):
    AuditEvent.objects.create(actor=request.user, role=user_role(request.user), module=module,
                              action=action, object_id=str(object_id), detail=detail[:2000])


def work_json(item):
    return {**item.data, "id": str(item.pk), "status": item.status, "version": item.version,
            "createdAt": item.created_at.isoformat(), "updatedAt": item.updated_at.isoformat()}


def account_json(user):
    profile = getattr(user, "userprofile", None)
    lock_status = "Permanently Locked" if profile and profile.account_locked else "Temporarily Locked" if profile and profile.temporary_locked_until and profile.temporary_locked_until > timezone.now() else "Active"
    from .sf9 import assignment_json
    return {"assignment": assignment_json(user), "lock_status": lock_status, "id": str(user.pk), "username": user.username, "name": user.get_full_name() or user.username,
            "email": user.email, "role": {**ROLE_LABELS, "STUDENTS": "Student", "ALUMNI": "Alumni"}.get(user_role(user), "Unassigned"),
            "status": lock_status if user.is_active else "Inactive",
            "lastSignIn": user.last_login.isoformat() if user.last_login else "Not yet signed in",
            "createdAt": user.date_joined.isoformat()}


def diagnostics():
    start = time.monotonic()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return [
        {"id": "api", "name": "Application API", "detail": "Responding to this request", "status": "Operational"},
        {"id": "database", "name": "Database service", "detail": f"Connection verified in {round((time.monotonic()-start)*1000)} ms", "status": "Operational"},
        {"id": "sms", "name": settings.SMS_PROVIDER + " SMS", "detail": "Configured; delivery depends on provider" if settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY else "Awaiting approval / configuration", "status": "Configured" if settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY else "Pending"},
    ]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def snapshot(request):
    role = staff(request, ROLE_LABELS)
    school, _ = Preference.objects.get_or_create(key="school", defaults={"data": SCHOOL_DEFAULTS})
    if role == "TEACHER":
        from .sf9 import assignment_json
        return Response({"role":role,"user":account_json(request.user),"settings":{**SCHOOL_DEFAULTS,**school.data},"assignment":assignment_json(request.user),"notifications":[],"requests":[],"students":[],"audit":[]})
    events = AuditEvent.objects.select_related("actor")

    logs = [{"id": f"AUD-{event.pk}", "actor": event.actor.username if event.actor else "System",
             "role": event.role, "module": event.module, "action": event.action, "detail": event.detail,
             "object_id": event.object_id, "created_at": event.created_at.isoformat()} for event in events]
    data = {"role": role, "user": account_json(request.user), "settings": {**SCHOOL_DEFAULTS, **school.data, "referencePrefix": SCHOOL_DEFAULTS["referencePrefix"], "lockout": SCHOOL_DEFAULTS["lockout"]},
            "settings_version": school.version, "audit": logs, "updatedAt": timezone.now().isoformat(),
            "sms_enabled": sms_available()}
    if role in {"ADMIN", "PRINCIPAL"}:
        items = CredentialRequest.objects.select_related("prepared_by", "approved_by", "sms").prefetch_related("events__actor")

        data["requests"] = RequestSerializer(items, many=True).data
        if role == "ADMIN":
            data["students"] = [{**record.data, "id": record.pk, "lrn": record.lrn, "version": record.version, "credentialFiles": [{"id": file.pk, "title": file.title, "isSample": file.is_sample} for file in record.credential_files.all()]} for record in StudentRecord.objects.prefetch_related("credential_files").order_by("lrn")]
    if role == "ADMIN":
        data["tickets"] = [work_json(item) for item in WorkItem.objects.filter(kind="ticket").order_by("-created_at")]
    if role == "ADMIN":
        data["teacher_accounts"] = [account_json(user) for user in User.objects.filter(userprofile__role="TEACHER").select_related("userprofile")]
    if role == "PRINCIPAL":
        data["accounts"] = [account_json(user) for user in User.objects.filter(userprofile__role__in=ROLE_LABELS).select_related("userprofile")]
    from .notifications import notification_rows, statistics
    data["notifications"] = notification_rows(request.user)
    data["statistics"] = statistics()
    data["settings"]["principalApproval"] = False
    return Response(data)


def text(values, key, required=False, maximum=2000):
    value = values.get(key, "")
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValidationError({key: "Enter a valid value."})
    return value.strip()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def student_action(request):
    staff(request, {"ADMIN"})
    values = request.data
    action = values.get("action")
    if action == "archive":
        ids = values.get("ids", [])
        if not isinstance(ids, list) or not ids or len(ids) > 500 or any(not isinstance(pk, int) for pk in ids):
            raise ValidationError("Select records to archive.")
        for record in StudentRecord.objects.select_for_update().filter(pk__in=ids):
            record.data = {**record.data, "status": "Archived"}
            record.version += 1
            record.save()
            audit(request, "Student Records", "Archived student record", record.pk)
        return Response({"message": "Records archived. Transaction history preserved."})
    if action not in {"save", "import"}:
        raise ValidationError("Unknown student record operation.")
    rows = values.get("rows") if action == "import" else [values.get("student", {})]
    if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
        raise ValidationError("Provide 1 to 500 student records.")
    if action == "import" and any(isinstance(row, dict) and row.get("id") for row in rows):
        raise ValidationError("Imports only create new records; use Edit for existing students.")
    fields = {"firstName", "middleName", "lastName", "sex", "birthday", "grade", "section", "status", "schoolYear", "guardian", "contact", "address"}
    for row in rows:
        if not isinstance(row, dict): raise ValidationError("Invalid student row.")
        if row.get("id") and not isinstance(row["id"], int): raise ValidationError("Invalid student identifier.")
        lrn = text(row, "lrn", False, 12) or None
        if lrn and not re.fullmatch(r"\d{12}", lrn):
            raise ValidationError("LRN must contain 12 digits.")
        cleaned = {key: text(row, key, key in {"firstName", "lastName"}) for key in fields}
        cleaned["status"] = cleaned["status"] or "Active"
        if cleaned["status"] not in {"Active", "Graduated", "Archived", "Transferred"}:
            raise ValidationError("Invalid student record status.")
        available = row.get("availableCredentials", [])
        if not isinstance(available, list) or len(available) > 30 or any(not isinstance(v, str) or len(v) > 160 for v in available):
            raise ValidationError("Invalid available credentials.")
        cleaned["availableCredentials"] = list(dict.fromkeys(value.strip() for value in available if value.strip()))
        if row.get("id"):
            record = get_object_or_404(StudentRecord.objects.select_for_update(), pk=row["id"])
            if row.get("version") != record.version:
                raise Conflict("Student record changed. Refresh before editing.")
            if lrn and StudentRecord.objects.filter(lrn=lrn).exclude(pk=record.pk).exists():
                raise ValidationError("A record with this LRN already exists.")
            record.lrn, record.data = lrn, cleaned
            record.version += 1
            record.save()
        else:
            if lrn and StudentRecord.objects.filter(lrn=lrn).exists():
                raise ValidationError(f"LRN {lrn} already exists; edit it instead.")
            record = StudentRecord.objects.create(lrn=lrn, data=cleaned)
        from .sf9 import sync_student
        sync_student(record)
        audit(request, "Student Records", "Saved student record", record.pk)
    return Response({"message": "Student records saved."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def settings_action(request):
    role = staff(request, {"ADMIN"})
    values = request.data.get("settings", {})
    if not isinstance(values, dict):
        raise ValidationError("Invalid settings.")
    if role == "ADMIN":
        Preference.objects.get_or_create(key="school", defaults={"data": SCHOOL_DEFAULTS})
        row = Preference.objects.select_for_update().get(key="school")
        if request.data.get("version") != row.version:
            raise Conflict("Settings changed. Reload before saving.")
        editable = {"schoolName", "schoolId", "division", "schoolEmail", "schoolPhone", "address", "academicYear", "processingDays", "pickupInstructions", "acceptRequests"}
        clean = {key: value for key, value in values.items() if key in editable}
        for key, value in clean.items():
            if key == "acceptRequests":
                if not isinstance(value, bool): raise ValidationError("Invalid request intake setting.")
            elif not isinstance(value, str) or len(value) > 500:
                raise ValidationError("Invalid school setting.")
        row.data = {**row.data, **clean}
        row.version += 1
        row.save()
    else:
        editable = {"displayName", "email", "phone", "timezone", "dateFormat", "rowsPerPage", "ticketAlerts", "maintenanceAlerts", "backupAlerts", "signinAlerts"}
        clean = {key: value for key, value in values.items() if key in editable}
        for value in clean.values():
            if not isinstance(value, (str, int, bool)) or len(str(value)) > 250:
                raise ValidationError("Invalid preference.")
        if clean.get("email"):
            try: validate_email(clean["email"])
            except DjangoValidationError: raise ValidationError("Invalid email address.")
        Preference.objects.update_or_create(key=f"user:{request.user.pk}", defaults={"data": clean})
        request.user.first_name = clean.get("displayName", request.user.first_name)[:150]
        request.user.email = clean.get("email", request.user.email)
        request.user.save(update_fields=["first_name", "email"])
    audit(request, "Settings", "Updated settings")
    return Response({"message": "Settings saved. Mandatory approval and audit controls remain enforced."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def work_action(request):
    staff(request, set())
    raise PermissionDenied("Technical maintenance is managed through the developer backend. Use Report an Issue for system problems.")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def account_action(request):
    actor_role = staff(request, {"PRINCIPAL", "ADMIN"})
    action, values = request.data.get("action"), request.data.get("values", {})
    if not isinstance(values, dict): raise ValidationError("Invalid account details.")
    role = {value: key for key, value in ROLE_LABELS.items()}.get(values.get("role"), values.get("role"))
    if actor_role == "ADMIN":
        if action == "create" and role != "TEACHER": raise PermissionDenied("Administration can manage teacher accounts only.")
        if action != "create":
            if not str(values.get("id", "")).isdigit(): raise ValidationError("Invalid account identifier.")
            target = get_object_or_404(User, pk=values.get("id"))
            if user_role(target) != "TEACHER" or (action == "edit" and role != "TEACHER"):
                raise PermissionDenied("Administration can manage teacher accounts only.")
    if action == "unlock":
        staff(request, {"PRINCIPAL", "ADMIN"})
        if not str(values.get("id", "")).isdigit(): raise ValidationError("Invalid account identifier.")
        profile = get_object_or_404(UserProfile.objects.select_for_update(), user_id=values["id"])
        if profile.role not in ROLE_LABELS or profile.user.is_superuser:
            raise PermissionDenied("Only school personnel accounts can be unlocked here.")
        profile.failed_login_attempts = 0
        profile.temporary_locked_until = None
        profile.account_locked = False
        profile.locked_at = None
        profile.unlocked_at, profile.unlocked_by = timezone.now(), request.user
        profile.save()
        audit(request, "User Access", "Principal account unlock", profile.user_id, "Account lock and failed attempt counter reset.")
        return Response({"message": "Account unlocked.", "account": account_json(profile.user)})
    if action == "create":
        username = text(values, "username", True, 150)
        if not re.fullmatch(r"[\w.@+-]+", username): raise ValidationError("Invalid username.")
        if role not in ROLE_LABELS: raise ValidationError("Select a staff role.")
        if User.objects.filter(username__iexact=username).exists(): raise ValidationError("Username is already taken.")
        user = User(username=username, first_name=text(values, "name", True, 150), email=text(values, "email", True, 254))
        password = values.get("password", "")
        if not isinstance(password, str) or not password or len(password)>256: raise ValidationError("Enter a password of at most 256 characters.")
        try:
            validate_email(user.email)
            validate_password(password, user)
        except DjangoValidationError as exc: raise ValidationError(exc.messages)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user, role=role)
    elif action in {"edit", "activate", "deactivate", "reset", "delete"}:
        # Lock staff accounts to protect the last active staff role under concurrent updates.
        list(User.objects.select_for_update().filter(userprofile__role__in=ROLE_LABELS).values_list("pk", flat=True))
        if not str(values.get("id", "")).isdigit(): raise ValidationError("Invalid account identifier.")
        user = get_object_or_404(User, pk=values.get("id"))
        if user.is_superuser: raise PermissionDenied("Manage superuser accounts through Django administration.")
        if user.pk == request.user.pk: raise ValidationError("Use your own profile settings; you cannot change your own staff access here.")
        existing_role = user_role(user)
        if existing_role not in ROLE_LABELS: raise PermissionDenied("Only assigned staff accounts can be managed here.")
        if existing_role in {"ADMIN", "PRINCIPAL"} and action in {"deactivate", "delete", "edit"} and (action != "edit" or role != existing_role):
            if not User.objects.filter(is_active=True, userprofile__role=existing_role).exclude(pk=user.pk).exists():
                raise ValidationError("The last active account for this staff role cannot be removed.")
        if action == "edit":
            if role not in ROLE_LABELS: raise ValidationError("Select a valid staff role.")
            user.first_name = text(values, "name", True, 150)
            if role == "TEACHER":
                username = text(values,"username",False,150) or user.username
                if not re.fullmatch(r"[\w.@+-]+",username) or User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists(): raise ValidationError("Choose a valid unused username.")
                user.username = username
                if "email" in values:
                    email=text(values,"email",True,254)
                    try: validate_email(email)
                    except DjangoValidationError as exc: raise ValidationError(exc.messages)
                    user.email=email
            UserProfile.objects.filter(user=user).update(role=role)
        elif action == "reset":
            password = values.get("password", "")
            if not isinstance(password, str) or not password or len(password)>256: raise ValidationError("Enter a password of at most 256 characters.")
            try: validate_password(password, user)
            except DjangoValidationError as exc: raise ValidationError(exc.messages)
            user.set_password(password)
        else:
            user.is_active = action == "activate"
        user.save()
    else:
        raise ValidationError("Choose create, edit, activate, deactivate or reset. Invitations are not configured.")
    if action in {"create", "edit"}:
        from .sf9 import save_assignment
        from .models import TeacherAssignment
        # Lock assignments in the same transaction as account role/assignment updates.
        list(TeacherAssignment.objects.select_for_update().filter(teacher=user))
        if role == "TEACHER": save_assignment(user,values,allow_adviser=actor_role=="PRINCIPAL")
        else: TeacherAssignment.objects.filter(teacher=user).delete()
        if role == "TEACHER":
            if values.get("status", "Active") not in {"Active", "Inactive", "Temporarily Locked", "Permanently Locked"}: raise ValidationError("Invalid account status.")
            user.is_active = values.get("status", "Active") != "Inactive"
            user.save(update_fields=['is_active'])
    audit(request, "User Access", f"Account {action}", user.pk, "Staff access updated; existing transaction history preserved.")
    return Response({"message": "Staff account saved.", "account": account_json(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def student_import_preview(request):
    staff(request, {"ADMIN"})
    from .student_import import parse_students
    rows = parse_students(request.FILES.get("file"))
    existing = list(StudentRecord.objects.filter(lrn__in=[row["lrn"] for row in rows]).values_list("lrn", flat=True))
    if existing: raise ValidationError("These LRNs already exist; edit their records instead: " + ", ".join(existing[:10]))
    return Response({"rows": rows, "count": len(rows), "message": "Preview only. Confirm import to save these students."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_credential_preview(request, student_id, credential_id):
    staff(request, {"ADMIN"})
    from .models import StudentCredential
    from django.http import FileResponse, Http404
    from io import BytesIO
    from PIL import Image, ImageOps
    import warnings
    file = get_object_or_404(StudentCredential, pk=credential_id, student_id=student_id)
    try:
        with file.document.open("rb") as source:
            if source.read(5) == b"%PDF-":
                source.seek(0)
                from pypdf import PdfReader
                reader = PdfReader(source)
                if reader.is_encrypted: raise ValueError()
                source.seek(0)
                content, mime = BytesIO(source.read()), "application/pdf"
            else:
                source.seek(0)
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    image = ImageOps.exif_transpose(Image.open(source))
                    image.thumbnail((2400, 3200))
                    content = BytesIO()
                    image.convert("RGB").save(content, format="PNG")
                    content.seek(0)
                    mime = "image/png"
    except FileNotFoundError: raise Http404()
    except Exception:
        from mimetypes import guess_type
        content = file.document.open("rb")
        mime = guess_type(file.document.name)[0] or "application/octet-stream"
        if mime in {"text/html", "application/xhtml+xml", "image/svg+xml"}:
            mime = "text/plain"
    audit(request, "Student Records", "Viewed student credential", file.pk)
    response = FileResponse(content, content_type=mime)
    response["Content-Disposition"] = "inline"
    from pathlib import Path
    response["X-Document-Filename"] = f"credential-{file.pk}{Path(file.document.name).suffix}"
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sms_balance(request):
    staff(request, {"ADMIN"})
    return Response(philsms_balance(), headers={"Cache-Control":"no-store"})
