from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException

from .models import CredentialRequest, RequestEvent, SmsNotification

S = CredentialRequest.Status
TRANSITIONS = {
    "prepare": ("ADMIN", {S.SUBMITTED, S.UNAVAILABLE, S.RETURNED}, S.PREPARING),
    "unavailable": ("ADMIN", {S.SUBMITTED, S.PREPARING, S.RETURNED}, S.UNAVAILABLE),
    "submit_review": ("ADMIN", {S.PREPARING}, S.PRINCIPAL_REVIEW),
    "approve": ("PRINCIPAL", {S.PRINCIPAL_REVIEW}, S.PRINCIPAL_APPROVED),
    "return": ("PRINCIPAL", {S.PRINCIPAL_REVIEW}, S.RETURNED),
    "ready": ("ADMIN", {S.PRINCIPAL_APPROVED}, S.READY),
    "collect": ("ADMIN", {S.READY}, S.COLLECTED),
}


class Conflict(APIException):
    status_code = 409
    default_detail = "This request changed. Refresh it before taking another action."


def user_role(user):
    if not user.is_authenticated:
        return None
    profile = getattr(user, "userprofile", None)
    return profile.role if profile else None


@transaction.atomic
def transition(request_id, actor, action, version, note=""):
    role, allowed, destination = TRANSITIONS[action]
    if user_role(actor) != role:
        raise PermissionDenied("Your role cannot perform this action.")
    item = CredentialRequest.objects.select_for_update().get(pk=request_id)
    if item.version != version:
        raise Conflict()
    if item.status not in allowed:
        raise Conflict("This action is not allowed at the current stage.")
    if action in {"unavailable", "return", "submit_review", "collect"} and not note.strip():
        raise ValidationError({"note": "Add the verification, correction, unavailability, or collection details."})
    previous = item.status
    if action == "submit_review":
        item.prepared_by = actor
    elif action == "approve":
        item.approved_by, item.approved_at = actor, timezone.now()
    elif action == "ready":
        if not item.approved_at:
            raise Conflict("Principal approval is required before release.")
        item.release_confirmed_by, item.ready_at = actor, timezone.now()
    elif action == "collect":
        item.collected_at = timezone.now()
        SmsNotification.objects.filter(request=item, status="QUEUED").update(
            status="CANCELLED", last_error="Already collected before the queued SMS was sent.",
        )
    item.status = destination
    item.version += 1
    item.save()
    RequestEvent.objects.create(request=item, actor=actor, action=action, from_status=previous, to_status=destination, note=note)
    if action == "ready":
        from operations.models import Preference
        school = Preference.objects.filter(key="school").first()
        instructions = school.data.get("pickupInstructions", "Please bring a valid ID.") if school else "Please bring a valid ID."
        notification, _ = SmsNotification.objects.get_or_create(
            request=item,
            defaults={"phone": item.phone, "message": f"CredTrack: Request {item.id} is ready for collection at the school records office. {instructions}"},
        )
        from .sms import send_notification
        transaction.on_commit(lambda: send_notification(notification.pk), robust=True)
    return item
