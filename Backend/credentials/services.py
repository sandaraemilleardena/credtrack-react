from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException

from .models import CredentialRequest, RequestEvent, SmsNotification

S = CredentialRequest.Status
TRANSITIONS = {
    "prepare": ("ADMIN", {S.SUBMITTED, S.UNAVAILABLE, S.RETURNED}, S.PREPARING),
    "unavailable": ("ADMIN", {S.SUBMITTED, S.PREPARING, S.RETURNED}, S.UNAVAILABLE),
    "submit_review": ("ADMIN", {S.SUBMITTED, S.PREPARING, S.RETURNED}, S.PRINCIPAL_REVIEW),
    "approve": ("PRINCIPAL", {S.PRINCIPAL_REVIEW}, S.PRINCIPAL_APPROVED),
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
def transition(request_id, actor, action, version, note="", release_date=None, release_time=None):
    if action not in TRANSITIONS:
        raise ValidationError("Choose an available workflow action.")
    role, allowed, destination = TRANSITIONS[action]
    if user_role(actor) != role:
        raise PermissionDenied("Your role cannot perform this action.")
    item = CredentialRequest.objects.select_for_update().get(pk=request_id)
    if item.version != version:
        raise Conflict()
    if item.status not in allowed:
        raise Conflict("This action is not allowed at the current stage.")
    if action == "ready" and bool(release_date) != bool(release_time):
        raise ValidationError("Enter both release date and time.")
    if action == "ready" and release_date and release_time:
        schedule = f"{release_date.isoformat()} at {release_time.strftime('%H:%M')} (Philippine time)"
        note = f"{note}\nRelease schedule: {schedule}".strip()
    previous = item.status
    if action == "submit_review":
        if not (item.verification_document or item.psa_document or item.id_document):
            raise ValidationError({"verification_document": "A PSA or valid ID is required before confirmation."})
        item.prepared_by = actor
        item.confirmed_at = timezone.now()
    elif action == "approve":
        if not item.confirmed_at or not (item.verification_document or item.psa_document or item.id_document):
            raise Conflict("Administration identity verification is required before approval.")
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
        delivery = f"is approved for forwarding to {item.receiving_school}. Please contact the records office for forwarding details." if item.delivery_method == "SCHOOL_TO_SCHOOL" else f"is ready for collection at the school records office. {instructions}"
        notification, _ = SmsNotification.objects.get_or_create(
            request=item,
            defaults={"phone": item.phone, "message": (f"CredTrack PMRMIS-South: Request {item.reference} {delivery}" if not release_date else (f"CredTrack PMRMIS-South: Request {item.reference} is ready for release on {schedule}. " + (f"Please contact the school records office for forwarding to {item.receiving_school}." if item.delivery_method == "SCHOOL_TO_SCHOOL" else "Please collect your credential at the school records office. Bring a valid ID.")))},
        )
        from .sms import send_notification
        transaction.on_commit(lambda: send_notification(notification.pk), robust=True)
    return item
