from django.core.management.base import BaseCommand
from credentials.models import SmsNotification
from credentials.sms import send_notification


class Command(BaseCommand):
    help = "Send queued release notices after Semaphore is configured; never retry uncertain sends."

    def handle(self, *args, **options):
        ids = list(SmsNotification.objects.filter(status="QUEUED").values_list("pk", flat=True)[:100])
        for notification_id in ids:
            send_notification(notification_id)
        self.stdout.write(f"Processed {len(ids)} queued notifications. Review SMS status in Credential Management.")
