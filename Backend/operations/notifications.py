from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone
from credentials.models import CredentialRequest
from .models import StaffNotification


def notify_staff(title, item):
    StaffNotification.objects.bulk_create([
        StaffNotification(recipient=user, request=item, title=title,
                          message=f"{item.reference} · {item.full_name} · {item.credential}")
        for user in User.objects.filter(is_active=True, userprofile__role__in=["ADMIN", "PRINCIPAL"])
    ])


def notification_rows(user):
    return list(StaffNotification.objects.filter(recipient=user).values("id", "title", "message", "request_id", "created_at", "read_at"))


def statistics():
    today = timezone.localdate()
    return CredentialRequest.objects.aggregate(
        total=Count("pk"), pending=Count("pk", filter=Q(status="PENDING")),
        approved=Count("pk", filter=Q(status="APPROVED")), released=Count("pk", filter=Q(status="RELEASED")),
        processing=Count("pk", filter=Q(status="APPROVED", ready_at__isnull=True)),
        scheduled=Count("pk", filter=Q(status="APPROVED", ready_at__isnull=False)),
        requested_today=Count("pk", filter=Q(created_at__date=today)),
        approved_today=Count("pk", filter=Q(approved_at__date=today)),
        processed_today=Count("pk", filter=Q(ready_at__date=today)),
        released_today=Count("pk", filter=Q(collected_at__date=today)),
    )
