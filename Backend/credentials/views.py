from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.exceptions import PermissionDenied

from .models import CredentialRequest, RequestEvent, ReferenceSequence
from django.utils import timezone
from .serializers import SubmissionSerializer, RequestSerializer, ActionSerializer
from .services import user_role, transition
from .sms import sms_available


class SubmissionThrottle(AnonRateThrottle):
    rate = "10/hour"


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([SubmissionThrottle])
def submit(request):
    from operations.models import Preference
    school = Preference.objects.filter(key="school").first()
    if school and school.data.get("acceptRequests") is False:
        return Response({"detail": "Online requests are temporarily paused. Please contact the school records office."}, status=503)
    serializer = SubmissionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    values = dict(serializer.validated_data)
    key = values.pop("submission_key")
    with transaction.atomic():
        year = timezone.localdate().year
        ReferenceSequence.objects.get_or_create(year=year)
        sequence = ReferenceSequence.objects.select_for_update().get(year=year)
        item = CredentialRequest.objects.filter(submission_key=key).first()
        created = item is None
        if item:
            if any(getattr(item, field) != value for field, value in values.items() if field not in {"verification_document", "psa_document", "id_document"}):
                return Response({"detail": "This submission key was already used for different details. Reopen the form."}, status=409)
        else:
            if sequence.value >= 99999:
                return Response({"detail": "Annual request capacity reached. Contact the school."}, status=503)
            sequence.value += 1
            sequence.save(update_fields=["value"])
            item = CredentialRequest.objects.create(submission_key=key, reference=f"CT-{year}-{sequence.value:05d}", **values)
            RequestEvent.objects.create(request=item, action="submitted", to_status=item.status)
            from operations.notifications import notify_staff
            notify_staff("New credential request received.", item)
    # Public submission never exposes the staff queue or personal details.
    return Response({"id": str(item.id), "reference": item.reference, "status": item.status,
                     "tracking_token": str(key), "sms_enabled": sms_available()},
                    status=201 if created else 200)


def staff_access(user):
    role = user_role(user)
    if role not in {"ADMIN", "PRINCIPAL"}:
        raise PermissionDenied("Only Administration and Principal staff can access credential requests.")
    return role


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def queue(request):
    role = staff_access(request.user)
    items = CredentialRequest.objects.select_related("prepared_by", "approved_by", "sms").prefetch_related("events__actor")

    from rest_framework.exceptions import ValidationError
    from django.utils.dateparse import parse_date
    for parameter, lookup in [("date_from", "created_at__date__gte"), ("date_to", "created_at__date__lte")]:
        value = request.query_params.get(parameter)
        if value:
            parsed = parse_date(value)
            if not parsed:
                raise ValidationError("Invalid report date.")
            items = items.filter(**{lookup: parsed})
    if request.query_params.get("grade"):
        items = items.filter(grade_level=request.query_params["grade"])
    if request.query_params.get("credential"):
        items = items.filter(credential__icontains=request.query_params["credential"])
    status = request.query_params.get("status")
    if status:
        if status not in CredentialRequest.Status.values:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Invalid request status.")
        items = items.filter(status=status)
    date_fields = {"requested_today": "created_at", "approved_today": "approved_at", "processed_today": "ready_at", "released_today": "collected_at"}
    category = request.query_params.get("category")
    if category in date_fields:
        items = items.filter(**{date_fields[category] + "__date": timezone.localdate()})
    elif category == "processing":
        items = items.filter(status="APPROVED", ready_at__isnull=True)
    elif category == "scheduled":
        items = items.filter(status="APPROVED", ready_at__isnull=False)
    elif category == "ready":
        from django.db.models import Q
        now = timezone.localtime()
        items = items.filter(status="APPROVED", ready_at__isnull=False).filter(Q(scheduled_release_date__isnull=True) | Q(scheduled_release_date__lt=now.date()) | Q(scheduled_release_date=now.date(), scheduled_release_time__lte=now.time().replace(tzinfo=None)))
    return Response({
        "role": role,
        "sms_enabled": sms_available(),
        "requests": RequestSerializer(items, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def action(request, request_id):
    role = staff_access(request.user)
    serializer = ActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    from .services import TRANSITIONS
    if role != TRANSITIONS[serializer.validated_data["action"]][0]:
        raise PermissionDenied("Your role cannot perform this action.")
    get_object_or_404(CredentialRequest, pk=request_id)
    item = transition(request_id, request.user, **serializer.validated_data)
    item.refresh_from_db()
    return Response(RequestSerializer(item).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def options(request):
    from .options import grade_sections, PURPOSES, CREDENTIALS
    return Response({"grade_sections": grade_sections(), "purposes": PURPOSES, "credentials": CREDENTIALS})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verification_document(request, request_id):
    from django.http import FileResponse, Http404
    from pathlib import Path
    from operations.models import AuditEvent
    role = staff_access(request.user)
    item = get_object_or_404(CredentialRequest, pk=request_id)

    kind = request.query_params.get("kind", "verification")
    if kind not in {"verification", "psa", "id"}: raise Http404()
    stored = getattr(item, f"{kind}_document")
    if not stored: raise Http404()
    try: document = stored.open("rb")
    except FileNotFoundError: raise Http404()
    if request.query_params.get("preview") == "1":
        from io import BytesIO
        try:
            header = document.read(5)
            document.seek(0)
            if header == b"%PDF-":
                from pypdf import PdfReader
                reader = PdfReader(document)
                if reader.is_encrypted or not reader.pages: raise ValueError()
                document.seek(0)
                preview = document
                mime = "application/pdf"
            else:
                from PIL import Image, ImageOps
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    image = ImageOps.exif_transpose(Image.open(document))
                    image.thumbnail((2400, 2400))
                    preview = BytesIO()
                    image.convert("RGB").save(preview, format="PNG")
                    preview.seek(0)
                document.close()
                mime = "image/png"
        except Exception:
            # Preserve access to the original when no image conversion is available.
            document.close()
            document = stored.open("rb")
            preview = document
            from mimetypes import guess_type
            mime = guess_type(stored.name)[0] or "application/octet-stream"
            if mime in {"text/html", "application/xhtml+xml", "image/svg+xml"}:
                mime = "text/plain"
        AuditEvent.objects.create(actor=request.user, role=role, module="Credentials", action="Previewed verification document", object_id=str(item.pk))
        response = FileResponse(preview, content_type=mime)
        response["Content-Disposition"] = "inline"
        response["X-Document-Filename"] = f"{item.reference}-{kind}{Path(stored.name).suffix}"
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response
    AuditEvent.objects.create(actor=request.user, role=role, module="Credentials", action="Viewed verification document", object_id=str(item.pk))
    response = FileResponse(document, as_attachment=True, filename=f"{item.reference}-{kind}{Path(stored.name).suffix}")
    response["Content-Type"] = "application/octet-stream"
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def attach_verification(request, request_id):
    from .documents import validate_document
    from .services import Conflict
    from rest_framework.exceptions import ValidationError
    if staff_access(request.user) != "ADMIN": raise PermissionDenied("Only Administration may attach verification documents.")
    item = get_object_or_404(CredentialRequest.objects.select_for_update(), pk=request_id)
    if item.status not in {"PENDING"}:
        raise Conflict("Verification documents cannot change after confirmation.")
    try: version = int(request.data.get("version", -1))
    except (ValueError, TypeError): raise ValidationError({"version": "Invalid version."})
    if version != item.version: raise Conflict()
    document = request.FILES.get("verification_document")
    if not document: raise ValidationError({"verification_document": "This question is required."})
    digest = validate_document(document)
    previous_name = item.verification_document.name
    item.verification_document, item.verification_sha256 = document, digest
    item.version += 1
    item.save()
    RequestEvent.objects.create(request=item, actor=request.user, action="verification_uploaded", from_status=item.status, to_status=item.status, note="Administration attached an identity verification document.")
    if previous_name:
        storage = item.verification_document.storage
        transaction.on_commit(lambda: storage.delete(previous_name), robust=True)
    return Response(RequestSerializer(item).data)

class TrackingThrottle(AnonRateThrottle):
    scope = "credential_tracking"
    rate = "30/hour"


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([TrackingThrottle])
def track(request):
    from rest_framework import serializers
    from rest_framework.exceptions import ValidationError
    try:
        key = serializers.UUIDField().run_validation(request.data.get("tracking_token"))
    except serializers.ValidationError:
        raise ValidationError("Enter the tracking code from your submission confirmation.")
    item = get_object_or_404(CredentialRequest.objects.select_related("sms"), submission_key=key)
    # The private tracking code reveals only operational status, never identity documents or personnel data.
    sms = getattr(item, "sms", None)
    return Response({"reference": item.reference, "status": item.status, "status_label": item.get_status_display(), "scheduled_release_date": item.scheduled_release_date, "scheduled_release_time": item.scheduled_release_time, "released_at": item.collected_at, "sms_status": sms.status if sms else "Not queued"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def refresh_sms_status(request, request_id):
    if staff_access(request.user) != "ADMIN":
        raise PermissionDenied("Only Administration processes SMS notifications.")
    item = get_object_or_404(CredentialRequest, pk=request_id)
    sms = getattr(item, "sms", None)
    if sms:
        from .sms import sync_notification_status
        sync_notification_status(sms.pk)
    item.refresh_from_db()
    return Response(RequestSerializer(item).data)
