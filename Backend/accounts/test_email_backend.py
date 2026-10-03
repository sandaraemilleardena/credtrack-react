import json
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMultiAlternatives, get_connection
from django.test import SimpleTestCase, override_settings


@override_settings(
    EMAIL_BACKEND="accounts.email_backend.ResendEmailBackend",
    RESEND_API_KEY="test-private-key",
    EMAIL_TIMEOUT=10,
)
class ResendBackendTests(SimpleTestCase):
    def message(self):
        message = EmailMultiAlternatives(
            "CredTrack Password Reset", "Reset link text",
            "CredTrack <noreply@pmrmis-southcredtrack.site>", ["recipient@gmail.com"],
        )
        message.attach_alternative("<p>Reset link</p>", "text/html")
        return message

    @patch("accounts.email_backend.urlopen")
    def test_sends_text_and_html_over_https(self, open_url):
        open_url.return_value.__enter__.return_value.read.return_value = b'{"id":"email-id"}'
        self.assertEqual(self.message().send(), 1)
        request = open_url.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-private-key")
        payload = json.loads(request.data)
        self.assertEqual(payload["to"], ["recipient@gmail.com"])
        self.assertEqual(payload["text"], "Reset link text")
        self.assertEqual(payload["html"], "<p>Reset link</p>")
        self.assertNotIn("test-private-key", request.data.decode())
        self.assertEqual(open_url.call_args.kwargs["timeout"], 10)

    @override_settings(RESEND_API_KEY="")
    @patch("accounts.email_backend.urlopen")
    def test_missing_key_does_not_connect(self, open_url):
        with self.assertRaises(ImproperlyConfigured):
            self.message().send()
        self.assertEqual(self.message().send(fail_silently=True), 0)
        open_url.assert_not_called()

    @patch("accounts.email_backend.urlopen")
    def test_provider_rejection_does_not_disclose_response(self, open_url):
        open_url.side_effect = HTTPError(
            "https://api.resend.com/emails", 403, "private-provider-message", {},
            BytesIO(b'private-provider-body'),
        )
        with self.assertRaisesRegex(RuntimeError, r"^Resend rejected email \(HTTP 403\)\.$"):
            self.message().send()

    @patch("accounts.email_backend.urlopen", side_effect=URLError("private-error"))
    def test_network_failure_and_silent_mode(self, open_url):
        with self.assertRaisesRegex(RuntimeError, "^Resend email connection failed\\.$"):
            self.message().send()
        self.assertEqual(self.message().send(fail_silently=True), 0)

    @patch("accounts.email_backend.urlopen")
    def test_unconfirmed_response_is_not_success(self, open_url):
        open_url.return_value.__enter__.return_value.read.return_value = b'{}'
        with self.assertRaisesRegex(RuntimeError, "did not confirm"):
            self.message().send()

    @patch("accounts.email_backend.urlopen")
    def test_empty_messages_and_unsupported_attachments(self, open_url):
        self.assertEqual(get_connection().send_messages([]), 0)
        message = self.message()
        message.attach("test.txt", "private-content", "text/plain")
        with self.assertRaises(ValueError):
            message.send()
        open_url.assert_not_called()
