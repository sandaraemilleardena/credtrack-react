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
from credentials.serializers import RequestSerializer
from credentials.services import user_role, Conflict
from .models import StudentRecord, WorkItem, Preference, AuditEvent

ROLE_LABELS = {"ADMIN": "Administrator", "PRINCIPAL": "Principal", "ICT": "ICT Personnel"}
SCHOOL_DEFAULTS = {
    "schoolName": "President Manuel Roxas Memorial Integrated School – South",
    "schoolId": "301905", "division": "", "schoolEmail": "", "schoolPhone": "", "address": "",
    "academicYear": "2026–2027", "timezone": "Asia/Manila (UTC+8)", "processingDays": "3 working days",
    "pickupInstructions": "Please bring a valid ID to the school records office.", "acceptRequests": True,
    "principalApproval": True, "documentVerification": True, "releaseAcknowledgment": True,
    "auditActions": True, "notifyRelease": True, "notifyNewRequest": True, "notifyApproval": True,
    "notifySecurity": True, "notifyBackup": True, "referencePrefix": "UUID",
    "passwordLength": "Django password validators", "mfa": False, "lockout": "Not configured",
    "sessionTimeout": "Django session policy", "automaticBackups": False,
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
    return {"id": str(user.pk), "username": user.username, "name": user.get_full_name() or user.username,
            "email": user.email, "role": ROLE_LABELS.get(user_role(user), "Unassigned"),
            "status": "Active" if user.is_active else "Inactive",
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
        {"id": "sms", "name": "Semaphore SMS", "detail": "Configured; delivery depends on provider" if settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY else "Awaiting approval / configuration", "status": "Configured" if settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY else "Pending"},
    ]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def snapshot(request):
    role = staff(request, ROLE_LABELS)
    school, _ = Preference.objects.get_or_create(key="school", defaults={"data": SCHOOL_DEFAULTS})
    events = AuditEvent.objects.select_related("actor")
    if role == "PRINCIPAL":
        events = events.filter(role="PRINCIPAL")
    elif role == "ICT":
        events = events.filter(role="ICT")
    logs = [{"id": f"AUD-{event.pk}", "actor": event.actor.username if event.actor else "System",
             "role": event.role, "module": event.module, "action": event.action, "detail": event.detail,
             "object_id": event.object_id, "created_at": event.created_at.isoformat()} for event in events[:1000]]
    data = {"role": role, "user": account_json(request.user), "settings": {**SCHOOL_DEFAULTS, **school.data},
            "settings_version": school.version, "audit": logs, "updatedAt": timezone.now().isoformat(),
            "sms_enabled": bool(settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY)}
    if role in {"ADMIN", "PRINCIPAL"}:
        items = CredentialRequest.objects.select_related("prepared_by", "approved_by", "sms").prefetch_related("events__actor")
        data["requests"] = RequestSerializer(items, many=True).data
        if role == "ADMIN":
            data["students"] = [{**record.data, "id": record.pk, "lrn": record.lrn, "version": record.version} for record in StudentRecord.objects.order_by("lrn")]
    if role in {"ADMIN", "ICT"}:
        data["tickets"] = [work_json(item) for item in WorkItem.objects.filter(kind="ticket").order_by("-created_at")]
    if role == "ICT":
        data["accounts"] = [account_json(user) for user in User.objects.filter(userprofile__role__in=ROLE_LABELS).select_related("userprofile")]
        data["tasks"] = [work_json(item) for item in WorkItem.objects.filter(kind="maintenance").order_by("-created_at")]
        data["backupJobs"] = []
        data["services"] = diagnostics()
        data["sms_summary"] = {status: SmsNotification.objects.filter(status=status).count() for status in ["QUEUED", "ACCEPTED", "FAILED", "UNKNOWN", "SENDING"]}
        preferences = Preference.objects.filter(key=f"user:{request.user.pk}").first()
        data["preferences"] = preferences.data if preferences else {}
        data["sessions"] = [{"id": "current", "device": "Current browser", "detail": "Authenticated Django session", "current": True, "lastActive": "Active now"}]
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
    fields = {"firstName", "middleName", "lastName", "sex", "birthday", "grade", "section", "status", "schoolYear", "guardian", "contact", "address"}
    for row in rows:
        if not isinstance(row, dict): raise ValidationError("Invalid student row.")
        if row.get("id") and not isinstance(row["id"], int): raise ValidationError("Invalid student identifier.")
        lrn = text(row, "lrn", True, 12)
        if not re.fullmatch(r"\d{12}", lrn):
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
            if StudentRecord.objects.filter(lrn=lrn).exclude(pk=record.pk).exists():
                raise ValidationError("A record with this LRN already exists.")
            record.lrn, record.data = lrn, cleaned
            record.version += 1
            record.save()
        else:
            if StudentRecord.objects.filter(lrn=lrn).exists():
                raise ValidationError(f"LRN {lrn} already exists; edit it instead.")
            record = StudentRecord.objects.create(lrn=lrn, data=cleaned)
        audit(request, "Student Records", "Saved student record", record.pk)
    return Response({"message": "Student records saved."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def settings_action(request):
    role = staff(request, {"ADMIN", "ICT"})
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
    staff(request, {"ADMIN", "ICT", "PRINCIPAL"})
    action = request.data.get("action")
    values = request.data.get("values", {})
    if not isinstance(values, dict): raise ValidationError("Invalid work item.")
    if action in {"update-ticket", "update-maintenance"}:
        try: uuid.UUID(str(values.get("id", "")))
        except (ValueError, TypeError, AttributeError): raise ValidationError("Invalid work item reference.")
    if action == "run-diagnostics":
        staff(request, {"ICT"})
        result = diagnostics()
        audit(request, "Maintenance", "Ran connectivity diagnostics")
        return Response({"services": result, "message": "API and database connectivity checked. Semaphore configuration reported."})
    if action in {"create-ticket", "ticket"}:
        data = {key: text(values, key, key in {"subject", "description"}) for key in ["subject", "description", "category", "requester", "priority", "requestId"]}
        if data["requestId"]:
            try: uuid.UUID(data["requestId"])
            except (ValueError, TypeError, AttributeError): raise ValidationError("Enter the full credential request reference.")
        if data["requestId"] and not CredentialRequest.objects.filter(pk=data["requestId"]).exists():
            raise ValidationError("Linked credential request does not exist.")
        data.update(requester=data["requester"] or request.user.username, priority=data["priority"] or "Normal", assignee="Unassigned", notes=[])
        item = WorkItem.objects.create(kind="ticket", data=data, created_by=request.user)
    elif action == "update-ticket":
        staff(request, {"ICT"})
        item = get_object_or_404(WorkItem.objects.select_for_update(), pk=values.get("id"), kind="ticket")
        if values.get("version") != item.version: raise Conflict()
        status = values.get("status", item.status)
        if status not in {"Open", "In progress", "Waiting", "Resolved"}: raise ValidationError("Invalid ticket status.")
        note = text(values, "note", status == "Resolved")
        item.status = status
        item.data = {**item.data, "priority": text(values, "priority") or item.data.get("priority", "Normal"), "assignee": text(values, "assignee") or "Unassigned"}
        if note:
            item.data["notes"] = [*item.data.get("notes", []), {"id": str(time.time_ns()), "body": note, "author": request.user.username, "createdAt": timezone.now().isoformat()}]
        item.version += 1
        item.save()
    elif action == "schedule-maintenance":
        staff(request, {"ICT"})
        data = {key: text(values, key, key in {"title", "owner", "service", "startsAt"}) for key in ["title", "owner", "service", "startsAt", "notes"]}
        start = parse_datetime(data["startsAt"])
        try: duration = int(values.get("duration", 0))
        except (ValueError, TypeError): raise ValidationError("Invalid duration.")
        if not start or timezone.is_naive(start) or start <= timezone.now() or not 1 <= duration <= 1440:
            raise ValidationError("Choose a future maintenance window of 1–1440 minutes.")
        # Serialize scheduling even when the task table is initially empty.
        lock, _ = Preference.objects.get_or_create(key="maintenance-lock")
        Preference.objects.select_for_update().get(pk=lock.pk)
        for existing in WorkItem.objects.filter(kind="maintenance", status__in=["Scheduled", "Running"]):
            other = parse_datetime(existing.data["startsAt"])
            if (data["service"] == existing.data["service"] or "All services" in {data["service"], existing.data["service"]}) and start < other + timedelta(minutes=existing.data["duration"]) and other < start + timedelta(minutes=duration):
                raise Conflict("This service already has maintenance scheduled for that window.")
        data["duration"] = duration
        item = WorkItem.objects.create(kind="maintenance", status="Scheduled", data=data, created_by=request.user)
    elif action == "update-maintenance":
        staff(request, {"ICT"})
        item = get_object_or_404(WorkItem.objects.select_for_update(), pk=values.get("id"), kind="maintenance")
        if values.get("version") != item.version: raise Conflict()
        allowed = {"Scheduled": {"Running", "Cancelled"}, "Running": {"Completed", "Cancelled"}}
        if values.get("status") not in allowed.get(item.status, set()): raise Conflict("Invalid maintenance transition.")
        note = text(values, "notes", True)
        item.status, item.data = values["status"], {**item.data, "notes": note}
        item.version += 1
        item.save()
    else:
        raise ValidationError("This operation requires deployment configuration; no change was made.")
    audit(request, "Support" if item.kind == "ticket" else "Maintenance", action, item.pk)
    return Response({"message": "Saved successfully.", "item": work_json(item)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def account_action(request):
    staff(request, {"ICT", "ADMIN"})
    action, values = request.data.get("action"), request.data.get("values", {})
    if not isinstance(values, dict): raise ValidationError("Invalid account details.")
    role = {value: key for key, value in ROLE_LABELS.items()}.get(values.get("role"), values.get("role"))
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
        if action in {"deactivate", "delete", "edit"} and (action != "edit" or role != existing_role):
            if not User.objects.filter(is_active=True, userprofile__role=existing_role).exclude(pk=user.pk).exists():
                raise ValidationError("The last active account for this staff role cannot be removed.")
        if action == "edit":
            if role not in ROLE_LABELS: raise ValidationError("Select a valid staff role.")
            user.first_name = text(values, "name", True, 150)
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
    audit(request, "User Access", f"Account {action}", user.pk, "Staff access updated; existing transaction history preserved.")
    return Response({"message": "Staff account saved.", "account": account_json(user)})
