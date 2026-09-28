from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.exceptions import PermissionDenied

from .models import CredentialRequest, RequestEvent
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
        item, created = CredentialRequest.objects.get_or_create(submission_key=key, defaults=values)
        if created:
            RequestEvent.objects.create(request=item, action="submitted", to_status=item.status)
        elif any(getattr(item, field) != value for field, value in values.items()):
            return Response({"detail": "This submission key was already used for different details. Reopen the form."}, status=409)
    # Public submission never exposes the staff queue or personal details.
    return Response({"id": str(item.id), "status": item.status,
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
        items = items.filter(status__in=["PRINCIPAL_REVIEW", "PRINCIPAL_APPROVED", "RETURNED", "READY", "COLLECTED"])
    return Response({
        "role": role,
        "sms_enabled": bool(settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY),
        "requests": RequestSerializer(items, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def action(request, request_id):
    staff_access(request.user)
    get_object_or_404(CredentialRequest, pk=request_id)
    serializer = ActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    item = transition(request_id, request.user, **serializer.validated_data)
    item.refresh_from_db()
    return Response(RequestSerializer(item).data)
