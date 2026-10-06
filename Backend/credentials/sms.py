"""Semaphore outbox. Never blindly retry a POST with an uncertain outcome."""
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import SmsNotification


def send_notification(notification_id):
    with transaction.atomic():
        item = SmsNotification.objects.select_for_update().get(pk=notification_id)
        if item.status != "QUEUED":
            return
        provider = settings.SMS_PROVIDER
        if provider == "PHILSMS":
            enabled = settings.PHILSMS_ENABLED and bool(settings.PHILSMS_API_TOKEN and settings.PHILSMS_SENDER_ID)
        else:
            enabled = settings.SMS_ENABLED and bool(settings.SEMAPHORE_API_KEY)
        if not enabled:
            item.last_error = "Waiting for Semaphore approval and configuration. No SMS has been sent."
            item.save(update_fields=["last_error", "updated_at"])
            return
        # A persisted claim prevents concurrent requests/workers sending twice.
        item.provider = provider
        item.status = "SENDING"
        item.attempts += 1
        item.last_error = ""
        item.save()
    if provider == "PHILSMS":
        return send_philsms(item)
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
        updated_at=timezone.now(),
        accepted_at=timezone.now() if status == "ACCEPTED" else None,
        sent_at=timezone.now() if status == "ACCEPTED" and provider_status.lower() == "sent" else None,
    )

def sync_notification_status(notification_id):
    """Read provider status without resending, including after an uncertain HTTP outcome."""
    from accounts.security import rate_limit
    item = SmsNotification.objects.get(pk=notification_id)
    if item.provider == "PHILSMS":
        return sync_philsms(item)
    if not settings.SMS_ENABLED or not settings.SEMAPHORE_API_KEY or not item.provider_id or item.sent_at:
        return item
    if not item.provider_id.isdigit():
        return item
    if rate_limit("sms-status-provider", "semaphore", 25, 60):
        return item
    try:
        url = f"https://api.semaphore.co/api/v4/messages/{item.provider_id}?" + urlencode({"apikey":settings.SEMAPHORE_API_KEY})
        with urlopen(Request(url, method="GET"), timeout=15) as response:
            result = json.load(response)
        record = result[0] if isinstance(result, list) and len(result) == 1 else result
        if not isinstance(record, dict) or str(record.get("message_id")) != item.provider_id:
            return item
        provider_status = str(record.get("status", ""))[:40]
        if provider_status.lower() not in {"queued", "pending", "sent", "failed", "refunded"}:
            return item
        with transaction.atomic():
            item = SmsNotification.objects.select_for_update().get(pk=notification_id)
            if item.sent_at:
                return item
            item.provider_status = provider_status
            item.status = "FAILED" if provider_status.lower() in {"failed", "refunded"} else "ACCEPTED"
            item.last_error = "Semaphore reported a failed message." if item.status == "FAILED" else ""
            if provider_status.lower() == "sent":
                # Record the time network sending was confirmed; no handset-delivery claim.
                item.sent_at = timezone.now()
            item.save()
    except Exception:
        # Never leak the API key, provider response or requester phone in errors.
        pass
    return item


def sms_available():
    if settings.SMS_PROVIDER == "PHILSMS":
        return bool(settings.PHILSMS_ENABLED and settings.PHILSMS_API_TOKEN and settings.PHILSMS_SENDER_ID)
    return bool(settings.SMS_ENABLED and settings.SEMAPHORE_API_KEY)


def philsms_request(path, payload=None):
    headers = {"Authorization": "Bearer " + settings.PHILSMS_API_TOKEN,
               "Accept": "application/json", "User-Agent": "CredTrack/1.0"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    request = Request(settings.PHILSMS_BASE_URL + "/" + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers, method="POST" if payload is not None else "GET")
    with urlopen(request, timeout=15) as response:
        return json.load(response)


def send_philsms(item):
    from django.core.cache import cache
    status, error, provider_id, provider_status = "UNKNOWN", "Outcome uncertain. Check PhilSMS history before retrying.", "", ""
    try:
        result = philsms_request("sms/send", {"recipient":item.phone.lstrip("+"),
            "sender_id":settings.PHILSMS_SENDER_ID, "type":"plain", "message":item.message})
        if isinstance(result, dict) and result.get("status") == "error":
            status, error = "FAILED", "PhilSMS rejected the request. Check token, sender and credits."
        elif isinstance(result, dict) and result.get("status") == "success":
            record = result.get("data")
            if isinstance(record, list) and len(record) == 1:
                record = record[0]
            if isinstance(record, dict) and record.get("uid"):
                provider_id = str(record["uid"])[:80]
                provider_status = str(record.get("status", "Queued"))[:40]
                status = "FAILED" if provider_status.lower() in {"failed", "rejected", "undelivered"} else "ACCEPTED"
                error = "PhilSMS reported a failed message." if status == "FAILED" else ""
    except HTTPError as exc:
        if 400 <= exc.code < 500:
            status, error = "FAILED", f"PhilSMS rejected the request (HTTP {exc.code}). Check account configuration."
    except Exception:
        pass
    SmsNotification.objects.filter(pk=item.pk, status="SENDING").update(
        status=status,last_error=error,provider_id=provider_id,provider_status=provider_status,
        updated_at=timezone.now(), accepted_at=timezone.now() if status=="ACCEPTED" else None,
        sent_at=timezone.now() if status=="ACCEPTED" and provider_status.lower() in {"sent","delivered"} else None)
    # The provider deducts the actual charge, including multipart messages.
    cache.delete("philsms-balance")


def sync_philsms(item):
    import re
    from accounts.security import rate_limit
    if not settings.PHILSMS_API_TOKEN or not item.provider_id or item.sent_at:
        return item
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", item.provider_id) or rate_limit("sms-status-provider", "philsms", 25, 60):
        return item
    try:
        result = philsms_request("sms/" + item.provider_id)
        record = result.get("data") if isinstance(result, dict) and result.get("status")=="success" else None
        if not isinstance(record, dict) or str(record.get("uid")) != item.provider_id:
            return item
        state = str(record.get("status", ""))[:40]
        if state.lower() not in {"queued","pending","sent","delivered","failed","rejected","undelivered"}:
            return item
        with transaction.atomic():
            item = SmsNotification.objects.select_for_update().get(pk=item.pk)
            if item.sent_at:
                return item
            item.provider_status = state
            item.status = "FAILED" if state.lower() in {"failed","rejected","undelivered"} else "ACCEPTED"
            item.last_error = "PhilSMS reported a failed message." if item.status=="FAILED" else ""
            if state.lower() in {"sent","delivered"}:
                item.sent_at = timezone.now()
            item.save()
    except Exception:
        pass
    return item


def philsms_balance():
    from decimal import Decimal, InvalidOperation
    from django.core.cache import cache
    cached = cache.get("philsms-balance")
    if cached is not None:
        return cached
    data = {"balance":None, "checked_at":timezone.now().isoformat(), "error":""}
    if not settings.PHILSMS_API_TOKEN:
        data["error"] = "PhilSMS API token is not configured."
    else:
        try:
            result = philsms_request("balance")
            value = result.get("data") if result.get("status")=="success" else None
            if isinstance(value, dict):
                value = next((value[k] for k in ("remaining_balance","balance","remaining_sms","sms_unit") if k in value), None)
            if value is None:
                raise ValueError()
            balance = Decimal(str(value).strip().removeprefix("\u20b1").removeprefix("PHP").strip().replace(",", ""))
            if not balance.is_finite() or balance < 0:
                raise ValueError()
            data["balance"] = str(balance)
        except (Exception, InvalidOperation):
            data["error"] = "Unable to read PhilSMS credits. Check the saved API token and provider connection."
    cache.set("philsms-balance", data, 15)
    return data
