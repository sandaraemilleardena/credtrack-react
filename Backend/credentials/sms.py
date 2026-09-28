"""Semaphore outbox. Never blindly retry a POST with an uncertain outcome."""
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction

from .models import SmsNotification


def send_notification(notification_id):
    with transaction.atomic():
        item = SmsNotification.objects.select_for_update().get(pk=notification_id)
        if item.status != "QUEUED":
            return
        if not settings.SMS_ENABLED or not settings.SEMAPHORE_API_KEY:
            item.last_error = "Waiting for Semaphore approval and configuration. No SMS has been sent."
            item.save(update_fields=["last_error", "updated_at"])
            return
        # A persisted claim prevents concurrent requests/workers sending twice.
        item.status = "SENDING"
        item.attempts += 1
        item.last_error = ""
        item.save()
    payload = {"apikey": settings.SEMAPHORE_API_KEY, "number": item.phone, "message": item.message}
    if settings.SEMAPHORE_SENDER_NAME:
        payload["sendername"] = settings.SEMAPHORE_SENDER_NAME
    status, error, provider_id, provider_status = "UNKNOWN", "Outcome uncertain. Check Semaphore before retrying.", "", ""
    try:
        request = Request("https://api.semaphore.co/api/v4/messages", data=urlencode(payload).encode(), method="POST")
        with urlopen(request, timeout=15) as response:
            result = json.load(response)
        if isinstance(result, list) and len(result) == 1 and result[0].get("message_id"):
            provider_id = str(result[0]["message_id"])
            provider_status = str(result[0].get("status", "Queued"))[:40]
            status = "FAILED" if provider_status.lower() in {"failed", "refunded"} else "ACCEPTED"
            error = "Semaphore rejected this message." if status == "FAILED" else ""
        elif isinstance(result, dict):
            status, error = "FAILED", "Semaphore rejected the request. Check account approval, sender name, and credits."
    except HTTPError as exc:
        if 400 <= exc.code < 500:
            status, error = "FAILED", f"Semaphore rejected the request (HTTP {exc.code}). Check account configuration."
    except Exception:
        # Do not leak provider responses, phone numbers, or API keys to logs/UI.
        pass
    SmsNotification.objects.filter(pk=notification_id, status="SENDING").update(
        status=status, last_error=error, provider_id=provider_id, provider_status=provider_status,
    )
