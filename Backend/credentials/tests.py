import uuid
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from .models import CredentialRequest, SmsNotification
from .services import transition
from .sms import send_notification


class WorkflowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = self.staff("records", "ADMIN")
        self.principal = self.staff("principal", "PRINCIPAL")
        self.ict = self.staff("ict", "ICT")
        self.client = APIClient()
        self.payload = {
            "submission_key": str(uuid.uuid4()), "requester_type": "Student",
            "full_name": "Workflow Test", "lrn": "123456789012", "grade_level": "Grade 10",
            "section": "Sample", "credential": "SF10", "purpose": "Admission", "phone": "09123456789",
        }

    def staff(self, name, role):
        user = User.objects.create_user(name, password="unit-test-only")
        UserProfile.objects.create(user=user, role=role)
        return user

    def submit(self):
        response = self.client.post("/api/credentials/submit/", self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return CredentialRequest.objects.get(pk=response.data["id"])

    def move(self, item, actor, action, note="Verified in test"):
        return transition(item.pk, actor, action, item.version, note)

    def approved(self):
        item = self.submit()
        item = self.move(item, self.admin, "prepare")
        item = self.move(item, self.admin, "submit_review")
        return self.move(item, self.principal, "approve")

    def test_complete_workflow_queues_only_after_final_admin_confirmation(self):
        item = self.approved()
        self.assertFalse(SmsNotification.objects.exists())
        with self.captureOnCommitCallbacks(execute=True):
            item = self.move(item, self.admin, "ready")
        sms = SmsNotification.objects.get(request=item)
        self.assertEqual(sms.status, "QUEUED")
        self.assertEqual(sms.attempts, 0)
        self.assertIn("No SMS has been sent", sms.last_error)
        item = self.move(item, self.admin, "collect", "Collected by requester; ID checked")
        self.assertEqual(item.status, "COLLECTED")
        self.assertEqual(item.events.count(), 6)
        sms.refresh_from_db()
        self.assertEqual(sms.status, "CANCELLED")

    def test_submission_retry_does_not_duplicate(self):
        item = self.submit()
        response = self.client.post("/api/credentials/submit/", self.payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(item.pk))
        self.assertEqual(CredentialRequest.objects.count(), 1)
        self.payload["purpose"] = "Changed"
        self.assertEqual(self.client.post("/api/credentials/submit/", self.payload, format="json").status_code, 409)

    def test_invalid_input_and_alumni(self):
        self.payload["phone"] = "123"
        self.assertEqual(self.client.post("/api/credentials/submit/", self.payload, format="json").status_code, 400)
        self.payload.update(phone="+639123456789", requester_type="Alumni", graduation_year="2020")
        self.submit()

    def test_anonymous_and_ict_cannot_view_personal_requests(self):
        self.assertEqual(self.client.get("/api/credentials/").status_code, 403)
        self.client.force_authenticate(self.ict)
        self.assertEqual(self.client.get("/api/credentials/").status_code, 403)

    def test_principal_sees_only_prepared_requests(self):
        item = self.submit()
        self.client.force_authenticate(self.principal)
        self.assertEqual(self.client.get("/api/credentials/").data["requests"], [])
        item = self.move(item, self.admin, "prepare")
        self.move(item, self.admin, "submit_review")
        self.assertEqual(len(self.client.get("/api/credentials/").data["requests"]), 1)

    def test_roles_cannot_skip_stages(self):
        item = self.submit()
        for user, action, expected in [(self.admin, "approve", 403), (self.principal, "ready", 403), (self.admin, "ready", 409), (self.principal, "approve", 409), (self.ict, "prepare", 403)]:
            self.client.force_authenticate(user)
            response = self.client.post(f"/api/credentials/{item.pk}/action/", {"action": action, "version": 0}, format="json")
            self.assertEqual(response.status_code, expected, response.data)
        self.assertFalse(SmsNotification.objects.exists())

    def test_return_and_unavailability_require_notes(self):
        item = self.submit()
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/credentials/{item.pk}/action/", {"action": "unavailable", "version": 0}, format="json")
        self.assertEqual(response.status_code, 400)
        item = self.move(item, self.admin, "unavailable", "Missing school record")
        item = self.move(item, self.admin, "prepare")
        item = self.move(item, self.admin, "submit_review")
        item = self.move(item, self.principal, "return", "Correct the name")
        self.assertEqual(item.status, "RETURNED")
        self.assertFalse(SmsNotification.objects.exists())

    def test_stale_double_release_has_only_one_notification(self):
        item = self.approved()
        version = item.version
        self.move(item, self.admin, "ready")
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/credentials/{item.pk}/action/", {"action": "ready", "version": version}, format="json")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(SmsNotification.objects.count(), 1)

    def test_authenticated_write_requires_csrf(self):
        item = self.submit()
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.admin)
        response = client.post(f"/api/credentials/{item.pk}/action/", {"action": "prepare", "version": 0}, format="json")
        self.assertEqual(response.status_code, 403)

    @override_settings(SMS_ENABLED=True, SEMAPHORE_API_KEY="test-key-not-real")
    @patch("credentials.sms.urlopen")
    def test_sms_acceptance_and_duplicate_protection(self, urlopen):
        item = self.approved()
        self.move(item, self.admin, "ready")
        sms = SmsNotification.objects.get(request=item)
        urlopen.return_value = BytesIO(b'[{"message_id": 101, "status": "Queued"}]')
        send_notification(sms.pk)
        send_notification(sms.pk)
        sms.refresh_from_db()
        self.assertEqual(sms.status, "ACCEPTED")
        self.assertEqual(sms.provider_status, "Queued")
        self.assertEqual(urlopen.call_count, 1)

    @override_settings(SMS_ENABLED=True, SEMAPHORE_API_KEY="test-key-not-real")
    @patch("credentials.sms.urlopen", side_effect=TimeoutError)
    def test_uncertain_sms_is_not_blindly_retried(self, urlopen):
        item = self.approved()
        self.move(item, self.admin, "ready")
        sms = SmsNotification.objects.get(request=item)
        send_notification(sms.pk)
        send_notification(sms.pk)
        sms.refresh_from_db()
        self.assertEqual(sms.status, "UNKNOWN")
        self.assertEqual(urlopen.call_count, 1)
