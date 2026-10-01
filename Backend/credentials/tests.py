import uuid
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from operations.models import Preference
import tempfile
from credentials.documents import private_storage
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
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.storage_patch = patch.object(private_storage, "_location", temporary.name)
        self.storage_patch.start()
        private_storage.__dict__.pop("location", None)
        self.addCleanup(self.storage_patch.stop)
        self.addCleanup(lambda: private_storage.__dict__.pop("location", None))
        Preference.objects.update_or_create(key="grade_sections", defaults={"data": {"Grade 10": ["Sample"]}})
        self.admin = self.staff("records", "ADMIN")
        self.principal = self.staff("principal", "PRINCIPAL")
        self.ict = self.staff("ict", "ICT")
        self.client = APIClient()
        self.payload = {
            "submission_key": str(uuid.uuid4()), "requester_type": "Student",
            "first_name": "Workflow", "middle_name": "Middle", "last_name": "Test", "delivery_method": "ON_SITE", "lrn": "123456789012", "grade_level": "Grade 10",
            "section": "Sample", "credential": "SF10", "purpose": "College admission", "phone": "09123456789",
        }

    def test_separate_documents_and_private_downloads(self):
        from PIL import Image
        buffer = BytesIO()
        Image.new("RGB", (2, 2)).save(buffer, format="PNG")
        content = buffer.getvalue() + b" " * (6 * 1024 * 1024)
        files = {key: SimpleUploadedFile("document.png", content, content_type="image/png") for key in ["psa_document", "id_document"]}
        response = self.client.post("/api/credentials/submit/", {**self.payload, **files}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        item = CredentialRequest.objects.get(pk=response.data["id"])
        self.assertTrue(item.psa_document and item.id_document)
        self.assertNotEqual(item.psa_document.name, item.id_document.name)
        url = f"/api/credentials/{item.pk}/verification/?kind=psa"
        self.assertIn(self.client.get(url).status_code, [401, 403])
        self.client.force_authenticate(self.admin)
        download = self.client.get(url)
        self.assertEqual(download.status_code, 200)
        download.close()
        data = self.client.get("/api/credentials/").data["requests"][0]
        self.assertTrue(data["has_psa_document"] and data["has_id_document"])
        self.assertNotIn("psa_document", data)
        item = self.move(item, self.admin, "prepare")
        self.move(item, self.admin, "submit_review")

    def test_any_file_type_submission_and_middle_name_required(self):
        for field in ["psa_document", "id_document"]:
            self.payload["submission_key"] = str(uuid.uuid4())
            response = self.client.post("/api/credentials/submit/", {**self.payload, field: SimpleUploadedFile("phone-document.heic", b"attachment data", content_type="application/octet-stream")}, format="multipart")
            self.assertEqual(response.status_code, 201, response.data)
        self.payload["middle_name"] = ""
        response = self.post_submission()
        self.assertEqual(response.status_code, 400)
        self.assertIn("middle_name", response.data)

    def test_preview_access_and_safe_image_response(self):
        item = self.submit()
        url = f"/api/credentials/{item.pk}/verification/?preview=1"
        self.assertIn(self.client.get(url).status_code, [401, 403])
        self.client.force_authenticate(self.principal)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response["Content-Disposition"], "inline")
        self.assertIn("no-store", response["Cache-Control"])
        response.close()

    def test_document_size_limit(self):
        from .documents import validate_document
        from rest_framework.exceptions import ValidationError
        file = SimpleUploadedFile("large.png", b"x" * (20 * 1024 * 1024 + 1), content_type="image/png")
        with self.assertRaises(ValidationError): validate_document(file)

    def test_preview_returns_every_attachment_without_format_rejection(self):
        self.client.force_authenticate(self.admin)
        for name, content, mime in [("notes.txt", b"Verification notes", "text/plain"),
                                    ("document.unknown", b"binary attachment", "application/octet-stream"),
                                    ("document.html", b"<script>alert(1)</script>", "text/plain"),
                                    ("locked.pdf", b"%PDF-broken", "application/pdf")]:
            with self.subTest(name=name):
                self.payload["submission_key"] = str(uuid.uuid4())
                item = self.submit()
                item.psa_document = SimpleUploadedFile(name, content)
                item.save()
                response = self.client.get(f"/api/credentials/{item.pk}/verification/?kind=psa&preview=1")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["Content-Type"], mime)
                self.assertEqual(b"".join(response.streaming_content), content)
                self.assertIn("sandbox", response["Content-Security-Policy"])
                response.close()

    def staff(self, name, role):
        user = User.objects.create_user(name, password="unit-test-only")
        UserProfile.objects.create(user=user, role=role)
        return user

    def post_submission(self):
        from PIL import Image
        buffer = BytesIO()
        Image.new("RGB", (2, 2)).save(buffer, format="PNG")
        return self.client.post("/api/credentials/submit/", {**self.payload, "verification_document": SimpleUploadedFile("id.png", buffer.getvalue(), content_type="image/png")}, format="multipart")

    def submit(self):
        response = self.post_submission()
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
        response = self.post_submission()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(item.pk))
        self.assertEqual(CredentialRequest.objects.count(), 1)
        self.payload["purpose"] = "Transfer"
        self.assertEqual(self.post_submission().status_code, 409)

    def test_invalid_input_and_alumni(self):
        self.payload["phone"] = "123"
        self.assertEqual(self.post_submission().status_code, 400)
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

    def test_actions_work_without_notes_and_keep_history(self):
        item = self.submit()
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/credentials/{item.pk}/action/", {"action": "unavailable", "version": 0}, format="json")
        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        item = self.move(item, self.admin, "prepare")
        item = self.move(item, self.admin, "submit_review", "")
        item = self.move(item, self.principal, "return", "")
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


    def test_reference_sequence_is_persisted_and_client_cannot_choose_it(self):
        first = self.submit()
        self.payload.update(submission_key=str(uuid.uuid4()),reference="CT-2026-99999")
        second = self.submit()
        self.assertRegex(first.reference,r"^CT-[0-9]{4}-00001$")
        self.assertEqual(int(second.reference[-5:]),2)
        self.assertNotEqual(second.reference,self.payload["reference"])
        self.assertEqual(first.first_name,"Workflow")
        self.assertEqual(first.last_name,"Test")

    def test_required_identity_grade_section_and_conditional_fields(self):
        self.throttle_patch = patch("credentials.views.SubmissionThrottle.allow_request", return_value=True)
        self.throttle_patch.start(); self.addCleanup(self.throttle_patch.stop)
        for key in ["first_name","middle_name","last_name","lrn","phone","purpose","credential","section","grade_level","delivery_method"]:
            value=self.payload.pop(key)
            response=self.post_submission()
            self.assertEqual(response.status_code,400,(key,response.data))
            self.payload[key]=value
        for changes in [{"lrn":"12345678901"},{"lrn":"1234567890123"},{"lrn":"1234ABC56789"},{"phone":"+639123"},{"phone":"+638123456789"},{"grade_level":"Grade 11"},{"section":"Wrong grade section"},{"purpose":"Other Documents"},{"delivery_method":"SCHOOL_TO_SCHOOL"}]:
            previous=self.payload.copy();self.payload.update(changes)
            self.assertEqual(self.post_submission().status_code,400,changes)
            self.payload=previous
        self.payload.update(purpose="Other Documents",other_purpose="Certification for an application",delivery_method="SCHOOL_TO_SCHOOL",receiving_school="Receiving school")
        item=self.submit();self.assertEqual(item.receiving_school,"Receiving school")

    def test_other_details_cleared_for_unrelated_choices(self):
        self.payload.update(other_purpose="must clear",receiving_school="must clear")
        item=self.submit();self.assertEqual(item.other_purpose,"");self.assertEqual(item.receiving_school,"")

    def test_private_document_requires_authorized_role_and_verified_stage(self):
        item=self.submit();url=f"/api/credentials/{item.pk}/verification/"
        self.assertEqual(self.client.get(url).status_code,403)
        for actor in [self.ict,self.principal]:
            self.client.force_authenticate(actor);self.assertEqual(self.client.get(url).status_code,403)
        self.client.force_authenticate(self.admin)
        response=self.client.get(url);self.assertEqual(response.status_code,200)
        self.assertIn("attachment",response["Content-Disposition"]);self.assertIn("no-store",response["Cache-Control"]);response.close()
        queue=self.client.get("/api/credentials/").data["requests"][0]
        self.assertNotIn("verification_document",queue);self.assertNotIn("verification_sha256",queue)
        self.assertTrue(queue["has_verification_document"])
        self.move(item,self.admin,"submit_review")
        self.client.force_authenticate(self.principal)
        response=self.client.get(url);self.assertEqual(response.status_code,200);response.close()
        self.assertEqual(self.client.get(f"/api/credentials/{uuid.uuid4()}/verification/").status_code,404)

    def test_snapshot_does_not_leak_unconfirmed_requests_to_principal(self):
        self.submit();self.client.force_authenticate(self.principal)
        self.assertEqual(self.client.get("/api/operations/snapshot/").data["requests"],[])

    def test_upload_rejects_missing_empty_and_oversize(self):
        self.assertEqual(self.client.post("/api/credentials/submit/",self.payload,format="multipart").status_code,400)
        for name,content,mime in [("empty.bin",b"","application/octet-stream"),("large.bin",b"x"*(20*1024*1024+1),"application/octet-stream")]:
            response=self.client.post("/api/credentials/submit/",{**self.payload,"verification_document":SimpleUploadedFile(name,content,content_type=mime)},format="multipart")
            self.assertEqual(response.status_code,400,(name,response.data))
            self.assertIn("verification_document",response.data)

    def test_backend_refuses_confirmation_without_identity_document(self):
        item=self.submit();item.verification_document="";item.save()
        self.client.force_authenticate(self.admin)
        response=self.client.post(f"/api/credentials/{item.pk}/action/",{"action":"submit_review","version":0,"note":"checked"},format="json")
        self.assertEqual(response.status_code,400)

    def test_public_options_only_exposes_grade_section_mapping(self):
        from operations.models import StudentRecord
        StudentRecord.objects.create(lrn="987654321012",data={"grade":"Grade 9","section":"Actual section","firstName":"Private"})
        response=self.client.get("/api/credentials/options/")
        self.assertEqual(len(response.data["grade_sections"]),10)
        self.assertEqual(response.data["grade_sections"]["Grade 9"],["LOVE", "FAITH", "KINDNESS", "SPJ", "HUMILITY"])
        self.assertNotIn("Private",str(response.data));self.assertNotIn("987654321012",str(response.data))


    def test_legacy_upload_requires_admin_correct_version_and_unconfirmed_stage(self):
        item=self.submit()
        from PIL import Image
        buffer=BytesIO();Image.new("RGB",(2,2),"red").save(buffer,format="PNG")
        def upload(version):
            return self.client.post(f"/api/credentials/{item.pk}/verification/upload/",{"version":version,"verification_document":SimpleUploadedFile("id.png",buffer.getvalue(),content_type="image/png")},format="multipart")
        self.assertEqual(upload(0).status_code,403)
        self.client.force_authenticate(self.principal);self.assertEqual(upload(0).status_code,403)
        self.client.force_authenticate(self.admin);self.assertEqual(upload(99).status_code,409)
        self.assertEqual(upload(0).status_code,200)
        item.refresh_from_db();self.assertEqual(item.version,1)
        self.move(item,self.admin,"submit_review")
        self.assertEqual(upload(2).status_code,409)

    def test_principal_can_reject_but_rejected_request_cannot_be_released(self):
        item=self.submit();item=self.move(item,self.admin,"submit_review")
        item=self.move(item,self.principal,"reject","Identity details could not be verified")
        self.assertEqual(item.status,"REJECTED")
        self.client.force_authenticate(self.admin)
        response=self.client.post(f"/api/credentials/{item.pk}/action/",{"action":"ready","version":item.version},format="json")
        self.assertEqual(response.status_code,409)


    def test_workflow_state_survives_new_authenticated_clients_at_every_stage(self):
        item = self.submit()
        for actor, action, expected in [(self.admin,"submit_review","PRINCIPAL_REVIEW"),(self.principal,"approve","PRINCIPAL_APPROVED"),(self.admin,"ready","READY"),(self.admin,"collect","COLLECTED")]:
            client=APIClient();client.force_login(actor)
            response=client.post(f"/api/credentials/{item.pk}/action/",{"action":action,"version":item.version,"note":"Verified for persistence test"},format="json")
            self.assertEqual(response.status_code,200,response.data)
            item.refresh_from_db();self.assertEqual(item.status,expected)
            fresh=APIClient();fresh.force_login(actor)
            row=next(r for r in fresh.get("/api/credentials/").data["requests"] if r["id"]==str(item.pk))
            self.assertEqual(row["status"],expected)
            self.assertEqual(row["reference"],item.reference)
            self.assertIsNotNone(row["confirmed_at"])
            if action != "submit_review": self.assertIsNotNone(row["approved_at"])

    def test_client_cannot_supply_confirmation_approval_or_release_on_submission(self):
        self.payload.update(status="COLLECTED",confirmed_at="2026-01-01T00:00:00Z",approved_at="2026-01-01T00:00:00Z",approved_by=self.principal.pk,role="PRINCIPAL",version=100)
        item=self.submit()
        self.assertEqual(item.status,"SUBMITTED");self.assertEqual(item.version,0)
        self.assertIsNone(item.confirmed_at);self.assertIsNone(item.approved_at);self.assertIsNone(item.approved_by)

    def test_student_alumni_and_forged_role_headers_cannot_read_or_mutate_credentials(self):
        item=self.submit()
        for role in ["STUDENTS","ALUMNI","ICT"]:
            user=self.staff("scope-"+role,role)
            client=APIClient();client.force_login(user)
            headers={"HTTP_X_ROLE":"ADMIN","HTTP_X_USER_ID":str(self.admin.pk)}
            self.assertEqual(client.get("/api/credentials/",**headers).status_code,403)
            for identifier in [item.pk,uuid.uuid4()]:
                self.assertEqual(client.get(f"/api/credentials/{identifier}/verification/",**headers).status_code,403)
                response=client.post(f"/api/credentials/{identifier}/action/",{"action":"submit_review","version":0,"role":"ADMIN","note":"forged"},format="json",**headers)
                self.assertEqual(response.status_code,403)
        item.refresh_from_db();self.assertEqual(item.status,"SUBMITTED")

    def test_wrong_action_role_does_not_disclose_record_existence(self):
        item=self.submit()
        for user,action in [(self.admin,"approve"),(self.principal,"ready")]:
            self.client.force_authenticate(user)
            for identifier in [item.pk,uuid.uuid4()]:
                response=self.client.post(f"/api/credentials/{identifier}/action/",{"action":action,"version":0},format="json")
                self.assertEqual(response.status_code,403)

    def test_returning_request_revokes_principal_document_access_until_reconfirmed(self):
        item=self.submit();item=self.move(item,self.admin,"submit_review")
        item=self.move(item,self.principal,"return","Correct student information")
        item.refresh_from_db();self.assertIsNone(item.confirmed_at)
        self.client.force_authenticate(self.principal)
        self.assertEqual(self.client.get(f"/api/credentials/{item.pk}/verification/").status_code,403)
        item=self.move(item,self.admin,"submit_review","Rechecked original records and identity")
        response=self.client.get(f"/api/credentials/{item.pk}/verification/")
        self.assertEqual(response.status_code,200);response.close()
