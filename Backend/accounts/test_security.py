from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from operations.models import AuditEvent
from .models import UserProfile

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class LoginAndResetTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user("account", email="person@example.test", password="Original-password-739!")
        self.profile = UserProfile.objects.create(user=self.user, role="ADMIN")

    def post(self, path, data, client=None):
        client = client or self.client
        csrf = client.get("/api/auth/csrf/").data["csrfToken"]
        return client.post(path, data, format="json", HTTP_X_CSRFTOKEN=csrf)

    def login(self, password="wrong", client=None):
        return self.post("/api/auth/login/", {"username":"account", "password":password, "role":"ADMIN"}, client)

    def expire_temporary_lock(self):
        UserProfile.objects.filter(pk=self.profile.pk).update(temporary_locked_until=timezone.now()-timedelta(seconds=1))

    def permanent_lock(self):
        for _ in range(3): self.login()
        self.expire_temporary_lock()
        for _ in range(3): response = self.login()
        self.assertEqual(response.status_code, 423)

    def reset_payload(self):
        self.user.refresh_from_db()
        return {"uid":urlsafe_base64_encode(force_bytes(self.user.pk)), "token":default_token_generator.make_token(self.user), "password":"Changed-password-834!", "confirm_password":"Changed-password-834!"}

    def test_two_rounds_lock_refresh_and_correct_password_blocked(self):
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login().status_code, 401)
        third = self.login()
        self.assertEqual(third.status_code, 429)
        self.assertEqual(third.data["retry_after"], 60)
        self.assertEqual(self.login("Original-password-739!", APIClient(enforce_csrf_checks=True)).status_code, 429)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.failed_login_attempts, 3)
        self.expire_temporary_lock()
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login().status_code, 423)
        self.assertEqual(self.login("Original-password-739!").status_code, 423)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.account_locked)
        self.assertEqual(self.profile.failed_login_attempts, 6)
        self.assertTrue(AuditEvent.objects.filter(action="Temporary account lock").exists())
        self.assertTrue(AuditEvent.objects.filter(action="Permanent account lock").exists())

    def test_success_resets_entire_failed_login_cycle(self):
        for _ in range(3): self.login()
        self.expire_temporary_lock()
        self.assertEqual(self.login("Original-password-739!").status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.failed_login_attempts, 0)
        self.assertIsNone(self.profile.temporary_locked_until)
        for _ in range(3): response = self.login()
        self.assertEqual(response.status_code, 429)

    def test_only_ict_can_unlock_and_action_is_audited(self):
        self.permanent_lock()
        endpoint = "/api/operations/accounts/"
        payload = {"action":"unlock", "values":{"id":self.user.pk}}
        self.assertEqual(self.post(endpoint,payload).status_code,403)
        for role in ["ADMIN","PRINCIPAL","STUDENTS","ALUMNI","ICT"]:
            staff = User.objects.create_user(role, password="Staff-password-928!")
            UserProfile.objects.create(user=staff,role=role)
            client = APIClient(enforce_csrf_checks=True);client.force_login(staff)
            response = self.post(endpoint,payload,client)
            self.assertEqual(response.status_code,200 if role=="ICT" else 403)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.account_locked)
        self.assertEqual(self.profile.failed_login_attempts,0)
        event = AuditEvent.objects.get(action="ICT account unlock")
        self.assertEqual(event.actor.username,"ICT")
        self.assertEqual(event.object_id,str(self.user.pk))
        self.assertEqual(self.login("Original-password-739!").status_code,200)

    def test_locked_account_existing_session_cannot_read_data(self):
        self.assertEqual(self.login("Original-password-739!").status_code,200)
        UserProfile.objects.filter(pk=self.profile.pk).update(account_locked=True)
        self.assertEqual(self.client.get("/api/operations/snapshot/").status_code,403)
        self.assertFalse(self.client.get("/api/auth/session/").data["authenticated"])

    def test_reset_request_matches_both_fields_and_returns_same_message(self):
        path = "/api/auth/forgot-password/"
        wrong = self.post(path,{"username":"account","email":"someone@example.test"})
        self.assertEqual(len(mail.outbox),0)
        correct = self.post(path,{"username":"account","email":"person@example.test"})
        self.assertEqual(wrong.data,correct.data)
        self.assertEqual(len(mail.outbox),1)
        self.assertEqual(mail.outbox[0].to,["person@example.test"])
        self.assertEqual(mail.outbox[0].from_email, "southcredtrack@gmail.com")
        self.assertEqual(mail.outbox[0].subject, "CredTrack Password Reset")
        self.assertIn("Reset Password", mail.outbox[0].alternatives[0].content)
        self.assertIn("http://localhost:7787/reset-password/",mail.outbox[0].body)
        self.assertNotIn(self.user.password,mail.outbox[0].body)
        self.assertNotIn("Original-password",mail.outbox[0].body)

    def test_reset_rejects_mismatch_then_hashes_password_and_rejects_reuse(self):
        payload = self.reset_payload()
        path = "/api/auth/reset-password/"
        response = self.post(path,{**payload,"confirm_password":"different"})
        self.assertEqual(response.status_code,400)
        self.assertEqual(response.data["error"],"Passwords do not match.")
        self.assertEqual(self.post(path,payload).status_code,200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(payload["password"]))
        self.assertNotEqual(self.user.password,payload["password"])
        self.assertEqual(self.post(path,payload).status_code,400)
        self.assertFalse(self.client.get("/api/auth/session/").data["authenticated"])
        self.assertTrue(AuditEvent.objects.filter(action="Password reset completed").exists())

    def test_reset_expires_at_one_hour(self):
        payload = self.reset_payload()
        later = default_token_generator._now()+timedelta(seconds=3601)
        with patch.object(default_token_generator,"_now",return_value=later):
            self.assertEqual(self.post("/api/auth/reset-password/",payload).status_code,400)

    def test_reset_cannot_change_other_account_or_use_tampered_token(self):
        payload = self.reset_payload()
        other = User.objects.create_user("other",password="Other-password-391!")
        self.assertEqual(self.post("/api/auth/reset-password/",{**payload,"uid":urlsafe_base64_encode(force_bytes(other.pk))}).status_code,400)
        self.assertEqual(self.post("/api/auth/reset-password/",{**payload,"token":"invalid"}).status_code,400)
        other.refresh_from_db();self.assertTrue(other.check_password("Other-password-391!"))

    def test_reset_keeps_permanent_and_temporary_locks(self):
        self.permanent_lock()
        self.assertEqual(self.post("/api/auth/reset-password/",self.reset_payload()).status_code,200)
        self.profile.refresh_from_db();self.assertTrue(self.profile.account_locked)
        self.assertEqual(self.login("Changed-password-834!").status_code,423)
        UserProfile.objects.filter(pk=self.profile.pk).update(account_locked=False,failed_login_attempts=3,temporary_locked_until=timezone.now()+timedelta(minutes=1))
        self.assertEqual(self.post("/api/auth/reset-password/",self.reset_payload()).status_code,200)
        self.assertEqual(self.login("Changed-password-834!").status_code,429)

    def test_reset_invalidates_existing_authenticated_sessions(self):
        self.login("Original-password-739!")
        other = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.post("/api/auth/reset-password/",self.reset_payload(),other).status_code,200)
        self.assertEqual(self.client.get("/api/operations/snapshot/").status_code,403)

    def test_reset_requests_are_rate_limited_without_account_enumeration(self):
        for index in range(5):
            self.assertEqual(self.post("/api/auth/forgot-password/",{"username":"account","email":"person@example.test"}).status_code,200 if index < 3 else 429)
        self.assertEqual(len(mail.outbox),3)

    def test_reset_endpoints_require_csrf_and_reject_weak_passwords(self):
        self.assertEqual(self.client.post("/api/auth/forgot-password/",{"username":"account","email":"person@example.test"}).status_code,403)
        self.assertEqual(self.client.post("/api/auth/reset-password/",self.reset_payload()).status_code,403)
        payload=self.reset_payload();payload.update(password="123",confirm_password="123")
        self.assertEqual(self.post("/api/auth/reset-password/",payload).status_code,400)

    def test_audit_does_not_contain_passwords_or_reset_tokens(self):
        self.login(); self.login("Original-password-739!")
        payload=self.reset_payload();self.post("/api/auth/reset-password/",payload)
        logged=" ".join(str(value) for row in AuditEvent.objects.values() for value in row.values())
        self.assertNotIn(payload["password"],logged);self.assertNotIn(payload["token"],logged)
        self.assertNotIn("Original-password-739!",logged)


    def test_temporary_lock_message_and_server_fields_cannot_be_overridden(self):
        for _ in range(3): response=self.login()
        self.assertEqual(response.data["error"],"Too many failed login attempts. Please wait 1 minute before trying again.")
        response=self.post("/api/auth/login/",{"username":"account","password":"Original-password-739!","role":"ADMIN","failed_login_attempts":0,"temporary_locked_until":None,"account_locked":False})
        self.assertEqual(response.status_code,429)
        self.profile.refresh_from_db();self.assertEqual(self.profile.failed_login_attempts,3)
        self.assertIsNotNone(self.profile.temporary_locked_until)

    def test_reset_rejects_malformed_and_out_of_range_account_ids(self):
        payload=self.reset_payload()
        for raw in ["99999999999999999999999999999999999","-1","0","not-an-id","١"]:
            response=self.post("/api/auth/reset-password/",{**payload,"uid":urlsafe_base64_encode(raw.encode())})
            self.assertEqual(response.status_code,400)
            self.assertEqual(response.data["error"],"This password reset link is invalid or has expired. Please request a new password reset link.")

    @override_settings(CREDTRACK_FRONTEND_URL="invalid-origin")
    def test_invalid_email_configuration_does_not_reveal_account_match(self):
        path="/api/auth/forgot-password/"
        matched=self.post(path,{"username":"account","email":"person@example.test"})
        unmatched=self.post(path,{"username":"missing","email":"missing@example.test"})
        self.assertEqual(matched.status_code,200);self.assertEqual(matched.data,unmatched.data)
        self.assertEqual(len(mail.outbox),0)
        self.assertTrue(AuditEvent.objects.filter(action="Password reset configuration invalid").exists())

    @patch("accounts.password_reset.send_mail",side_effect=OSError("SMTP unavailable"))
    def test_email_failure_is_generic_and_audited_without_secrets(self,send):
        path="/api/auth/forgot-password/"
        matched=self.post(path,{"username":"account","email":"person@example.test"})
        unmatched=self.post(path,{"username":"missing","email":"missing@example.test"})
        self.assertEqual(matched.data,unmatched.data);self.assertEqual(send.call_count,1)
        self.assertTrue(AuditEvent.objects.filter(action="Password reset email delivery failed").exists())

    def test_actual_email_link_can_reset_password_and_new_password_logs_in(self):
        import re
        self.post("/api/auth/forgot-password/",{"username":"account","email":"person@example.test"})
        match=re.search(r"/reset-password/([^/\s]+)/([^/\s]+)",mail.outbox[0].body)
        self.assertIsNotNone(match)
        payload={"uid":match[1],"token":match[2],"password":"New-valid-password-583!","confirm_password":"New-valid-password-583!"}
        self.assertEqual(self.post("/api/auth/reset-password/",payload).status_code,200)
        self.assertEqual(self.login(payload["password"]).status_code,200)
        self.assertEqual(self.post("/api/auth/reset-password/",payload).status_code,400)
