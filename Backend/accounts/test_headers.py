from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings


@override_settings(DEBUG=False, SECURE_SSL_REDIRECT=True, SECURE_HSTS_SECONDS=3600)
class SecurityHeaderTests(SimpleTestCase):
    def assert_policies(self, response):
        self.assertEqual(response["Strict-Transport-Security"], "max-age=3600")
        self.assertEqual(response["X-Frame-Options"], "DENY")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["Referrer-Policy"], "same-origin")
        self.assertIn("camera=()", response["Permissions-Policy"])
        policy = response["Content-Security-Policy"]
        self.assertIn("script-src 'self';", policy)
        self.assertNotIn("'unsafe-eval'", policy)
        self.assertIn("frame-ancestors 'none'", policy)
        self.assertIn("frame-src 'self' blob:", policy)
        self.assertIn("https://fonts.googleapis.com", policy)

    def test_home_login_and_errors(self):
        for path in ("/", "/admin/login/", "/api/nonexistent/"):
            with self.subTest(path=path):
                self.assert_policies(self.client.get(path, secure=True))

    def test_proxy_https_and_http_redirect(self):
        self.assert_policies(self.client.get("/", HTTP_X_FORWARDED_PROTO="https"))
        response = self.client.get("/")
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "https://testserver/")
        self.assertNotIn("Strict-Transport-Security", response)
        self.assertIn("Content-Security-Policy", response)

    def test_whitenoise_static_files(self):
        with TemporaryDirectory() as directory:
            Path(directory, "header-check.txt").write_text("static asset")
            with override_settings(WHITENOISE_ROOT=Path(directory)):
                response = self.client.get("/header-check.txt", secure=True)
                self.assertEqual(response.status_code, 200)
                self.assert_policies(response)
                response.close()

    @override_settings(DEBUG=True, SECURE_SSL_REDIRECT=False, SECURE_HSTS_SECONDS=0)
    def test_local_development(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Content-Security-Policy", response)
        self.assertNotIn("Strict-Transport-Security", response)
