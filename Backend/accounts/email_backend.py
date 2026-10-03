"""Send Django mail through Resend HTTPS, supported on Railway Free."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        key = settings.RESEND_API_KEY.strip()
        if not key:
            if self.fail_silently:
                return 0
            raise ImproperlyConfigured("RESEND_API_KEY is required for Resend email delivery.")
        sent = 0
        for message in email_messages:
            if not message.recipients():
                continue
            try:
                # Validate header values using Django, without sending via SMTP.
                message.message()
                if message.attachments or message.extra_headers:
                    raise ValueError("Resend backend does not support attachments or custom headers.")
                payload = {
                    "from": message.from_email,
                    "subject": message.subject,
                    "text": message.body,
                }
                for name in ("to", "cc", "bcc", "reply_to"):
                    values = getattr(message, name)
                    if values:
                        payload[name] = list(values)
                if message.content_subtype == "html":
                    payload["html"] = message.body
                    del payload["text"]
                for alternative in getattr(message, "alternatives", ()):
                    if alternative.mimetype != "text/html":
                        raise ValueError("Resend backend only supports HTML alternatives.")
                    payload["html"] = str(alternative.content)
                request = Request(
                    "https://api.resend.com/emails",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": "CredTrack/1.0",
                    },
                    method="POST",
                )
                try:
                    with urlopen(request, timeout=settings.EMAIL_TIMEOUT) as response:
                        accepted = json.loads(response.read())
                        if not accepted.get("id"):
                            raise RuntimeError("Resend did not confirm email acceptance.")
                except HTTPError as exc:
                    # Do not include provider bodies, which may contain private values.
                    status = exc.code
                    exc.close()
                    raise RuntimeError(f"Resend rejected email (HTTP {status}).") from None
                except (URLError, TimeoutError, OSError):
                    raise RuntimeError("Resend email connection failed.") from None
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent
