from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException

from .models import CredentialRequest, RequestEvent, SmsNotification

S = CredentialRequest.Status
TRANSITIONS = {
    "approve": ("ADMIN", {S.PENDING}, S.APPROVED),
    "ready": ("ADMIN", {S.APPROVED}, S.APPROVED),
    "collect": ("ADMIN", {S.APPROVED}, S.RELEASED),
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
    if action == "ready" and not (release_date and release_time):
        raise ValidationError("Enter both release date and time.")
    if action == "ready" and release_date and release_time:
        schedule = f"{release_date.isoformat()} at {release_time.strftime('%H:%M')} (Philippine time)"
        note = f"{note}\nRelease schedule: {schedule}".strip()
    previous = item.status
    if action == "approve":
        if not (item.verification_document or item.psa_document or item.id_document):
            raise ValidationError({"verification_document": "At least one identity document is required before approval."})
        item.prepared_by = actor
        item.confirmed_at = timezone.now()

        item.approved_by, item.approved_at = actor, timezone.now()
    elif action == "ready":
        if not item.approved_at:
            raise Conflict("Administration approval is required before release.")
        if item.ready_at:
            raise Conflict("Release is already scheduled. The original schedule is preserved.")
        item.scheduled_release_date, item.scheduled_release_time = release_date, release_time
        item.release_confirmed_by, item.ready_at = actor, timezone.now()
    elif action == "collect":
        if not item.ready_at:
            raise Conflict("Schedule the release before recording it as released.")
        item.collected_at = timezone.now()
        SmsNotification.objects.filter(request=item, status="QUEUED").update(
            status="CANCELLED", last_error="Already collected before the queued SMS was sent.",
        )
    item.status = destination
    item.version += 1
    item.save()
    RequestEvent.objects.create(request=item, actor=actor, action=action, from_status=previous, to_status=destination, note=note)
    from operations.notifications import notify_staff
    notify_staff("Credential approved by Administration." if action == "approve" else "Credential released." if action == "collect" else "Credential scheduled for release.", item)
    if action == "ready":
        months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        date_label = f"{months[release_date.month - 1]} {release_date.day}, {release_date.year}"
        time_label = f"{release_time.hour % 12 or 12}:{release_time.minute:02d} {'AM' if release_time.hour < 12 else 'PM'}"
        when = f"{date_label} at {time_label}"
        if item.delivery_method == "SCHOOL_TO_SCHOOL":
            message = f"CredTrack: {item.reference} scheduled for school-to-school sending on {when}. Contact PMRMIS-SOUTH admin office for details."
        else:
            message = f"CredTrack: {item.reference} ready for pickup on {when}. Visit PMRMIS-SOUTH admin office. Bring a valid ID."
        notification, _ = SmsNotification.objects.get_or_create(
            request=item, defaults={"phone": item.phone, "message": message},
        )
        from .sms import send_notification
        transaction.on_commit(lambda: send_notification(notification.pk), robust=True)
    return item
