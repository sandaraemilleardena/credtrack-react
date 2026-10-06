from django.core.management.base import BaseCommand
from credentials.models import SmsNotification
from credentials.sms import send_notification, sync_notification_status


class Command(BaseCommand):
    help = "Send queued release notices after the selected SMS provider is configured; never retry uncertain sends."

    def handle(self, *args, **options):
        ids = list(SmsNotification.objects.filter(status="QUEUED").values_list("pk", flat=True)[:100])
        for notification_id in ids:
            send_notification(notification_id)
        statuses = list(SmsNotification.objects.filter(status="ACCEPTED", sent_at__isnull=True).exclude(provider_id="").values_list("pk", flat=True)[:25])
        for notification_id in statuses:
            sync_notification_status(notification_id)
        self.stdout.write(f"Processed {len(ids)} queued notifications. Review SMS status in Credential Management.")
