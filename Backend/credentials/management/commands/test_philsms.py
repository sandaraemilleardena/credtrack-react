"""Send one PhilSMS test, independently of the existing Semaphore queue."""
import json
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send exactly one short PhilSMS delivery test to your own phone."

    def add_arguments(self, parser):
        parser.add_argument("phone", help="Your test number in 09 or 639 format")

    def handle(self, *args, **options):
        phone = options["phone"].strip().lstrip("+")
        if phone.startswith("09"):
            phone = "63" + phone[1:]
        if not re.fullmatch(r"639[0-9]{9}", phone):
            raise CommandError("Provide one Philippine mobile number in 09 or 639 format.")
        if not settings.PHILSMS_API_TOKEN or not settings.PHILSMS_SENDER_ID:
            raise CommandError("Set PHILSMS_API_TOKEN and PHILSMS_SENDER_ID in Backend/.env.")
        request = Request(
            settings.PHILSMS_BASE_URL + "/sms/send",
            data=json.dumps({
                "recipient": phone,
                "sender_id": settings.PHILSMS_SENDER_ID,
                "type": "plain",
                "message": "PMRMIS South: This is a CredTrack SMS delivery test.",
            }).encode("utf-8"),
            headers={
                "Authorization": "Bearer " + settings.PHILSMS_API_TOKEN,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=20) as response:
                result = json.load(response)
        except HTTPError as exc:
            if 400 <= exc.code < 500:
                raise CommandError(
                    f"PhilSMS rejected the request (HTTP {exc.code}). Check token, sender, and credits."
                ) from None
            raise CommandError("Outcome uncertain. Check PhilSMS history before retrying.") from None
        except Exception:
            raise CommandError("Outcome uncertain. Check PhilSMS history before retrying.") from None
        if isinstance(result, dict) and result.get("status") == "success":
            self.stdout.write(self.style.SUCCESS(
                "PhilSMS accepted one test. Check your phone and record delivery time. "
                "API acceptance does not confirm handset delivery."
            ))
        elif isinstance(result, dict) and result.get("status") == "error":
            raise CommandError("PhilSMS rejected the request. Check token, sender, and credits.")
        else:
            raise CommandError("Unrecognized response. Check PhilSMS history before retrying.")
