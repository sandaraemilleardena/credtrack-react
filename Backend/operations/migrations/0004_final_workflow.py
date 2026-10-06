import re
from datetime import date, time
from django.db import migrations
from django.utils import timezone


def migrate_workflow(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Request = apps.get_model("credentials", "CredentialRequest")
    Event = apps.get_model("credentials", "RequestEvent")
    Notification = apps.get_model("operations", "StaffNotification")
    User.objects.filter(userprofile__role="ICT").update(is_active=False)
    status_map = {"SUBMITTED": "PENDING", "PREPARING": "PENDING", "UNAVAILABLE": "PENDING", "RETURNED": "PENDING", "REJECTED": "PENDING", "PRINCIPAL_REVIEW": "PENDING", "PRINCIPAL_APPROVED": "APPROVED", "READY": "APPROVED", "COLLECTED": "RELEASED"}
    for old, new in status_map.items():
        Request.objects.filter(status=old).update(status=new)
    # Historical actors and events remain intact; recover schedules from the prior audit notes.
    for item in Request.objects.filter(ready_at__isnull=False).iterator():
        for event in Event.objects.filter(request=item, action="ready").order_by("created_at"):
            match = re.search(r"Release schedule: (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})", event.note)
            if match:
                item.scheduled_release_date = date.fromisoformat(match[1])
                item.scheduled_release_time = time.fromisoformat(match[2])
                break
        item.save(update_fields=["scheduled_release_date", "scheduled_release_time"])
    for user in User.objects.filter(is_active=True, userprofile__role__in=["ADMIN", "PRINCIPAL"]):
        Notification.objects.bulk_create([Notification(recipient=user, request=item, title="Credential activity", message=f"{item.reference} · {item.full_name} · {item.status}") for item in Request.objects.order_by("-created_at")[:100]])


class Migration(migrations.Migration):
    dependencies = [("operations", "0003_issuereport_staffnotification"), ("credentials", "0008_credentialrequest_scheduled_release_date_and_more"), ("accounts", "0003_alter_userprofile_role")]
    operations = [migrations.RunPython(migrate_workflow, migrations.RunPython.noop)]
