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
    # Public submission never exposes the staff queue or personal details.
    return Response({"id": str(item.id), "reference": item.reference, "status": item.status,
                     "sms_enabled": bool(settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY)},
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
    if role == "PRINCIPAL":
        items = items.filter(status__in=["PRINCIPAL_REVIEW", "PRINCIPAL_APPROVED", "RETURNED", "READY", "COLLECTED", "REJECTED"])
    return Response({
        "role": role,
        "sms_enabled": bool(settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY),
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
    if role == "PRINCIPAL" and not item.confirmed_at:
        raise PermissionDenied("Administration verification is required first.")
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
    if item.status not in {"SUBMITTED", "PREPARING", "UNAVAILABLE", "RETURNED"}:
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
