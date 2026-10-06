import uuid
from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import UserProfile
from .models import AuditEvent, Preference, StudentRecord, WorkItem


class OperationsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.users = {}
        for role in ['ADMIN', 'PRINCIPAL', 'ICT']:
            user = User.objects.create_user(role.lower(), password='Test-only-password-384!')
            UserProfile.objects.create(user=user, role=role)
            self.users[role] = user

    def as_role(self, role):
        self.client.force_authenticate(self.users[role])

    def post(self, path, data):
        return self.client.post('/api/operations/' + path + '/', data, format='json')

    def test_snapshot_role_privacy(self):
        self.assertEqual(self.client.get('/api/operations/snapshot/').status_code,403)
        for role in self.users:
            self.as_role(role);result=self.client.get('/api/operations/snapshot/')
            if role=='ICT':
                self.assertEqual(result.status_code,403);continue
            self.assertEqual(result.status_code,200,result.data)
            self.assertEqual('students' in result.data,role=='ADMIN')
            self.assertEqual('accounts' in result.data,role=='PRINCIPAL')
            self.assertIn('requests',result.data)

    def test_records_saved_versioned_and_archived(self):
        row = {'lrn': '123456789012', 'firstName': 'Test', 'lastName': 'Student', 'availableCredentials': ['SF10']}
        self.as_role('ICT')
        self.assertEqual(self.post('students', {'action': 'save', 'student': row}).status_code, 403)
        self.as_role('ADMIN')
        self.assertEqual(self.post('students', {'action': 'save', 'student': row}).status_code, 200)
        record = StudentRecord.objects.get()
        row.update(id=record.pk, version=0, firstName='Updated')
        self.assertEqual(self.post('students', {'action': 'save', 'student': row}).status_code, 200)
        self.assertEqual(self.post('students', {'action': 'save', 'student': row}).status_code, 409)
        self.assertEqual(self.post('students', {'action': 'archive', 'ids': [record.pk]}).status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.data['status'], 'Archived')
        self.assertEqual(record.data['availableCredentials'], ['SF10'])
        self.assertEqual(AuditEvent.objects.count(), 3)

    def test_import_is_atomic(self):
        self.as_role('ADMIN')
        rows = [{'lrn': '123456789012', 'firstName': 'A', 'lastName': 'B'}, {'lrn': 'invalid', 'firstName': 'C', 'lastName': 'D'}]
        self.assertEqual(self.post('students', {'action': 'import', 'rows': rows}).status_code, 400)
        self.assertFalse(StudentRecord.objects.exists())

    def test_administration_reports_issue_for_backend_developers(self):
        from .models import IssueReport
        self.as_role('ADMIN')
        result=self.post('issues',{'problem_type':'SMS Problem','message':'The SMS could not be sent.'})
        self.assertEqual(result.status_code,201,result.data)
        item=IssueReport.objects.get(pk=result.data['id'])
        self.assertEqual(item.submitted_by,self.users['ADMIN'])
        self.as_role('PRINCIPAL');self.assertEqual(self.post('issues',{'problem_type':'SMS Problem','message':'Test'}).status_code,403)

    def test_maintenance_is_not_an_application_role_function(self):
        for role in self.users:
            self.as_role(role)
            self.assertEqual(self.post('work',{'action':'schedule-maintenance','values':{}}).status_code,403)

    def test_staff_account_is_real_and_last_role_protected(self):
        self.as_role('PRINCIPAL')
        self.assertEqual(self.post('accounts',{'action':'deactivate','values':{'id':self.users['ADMIN'].pk}}).status_code,400)
        payload={'username':'records2','name':'Records Two','email':'records2@example.test','role':'Administrator','password':'Test-only-random-95!abc'}
        result=self.post('accounts',{'action':'create','values':payload})
        self.assertEqual(result.status_code,200,result.data)
        account=User.objects.get(username='records2');self.assertTrue(account.check_password(payload['password']))
        self.assertEqual(account.userprofile.role,'ADMIN')
        self.assertEqual(self.post('accounts',{'action':'deactivate','values':{'id':account.pk}}).status_code,200)
        account.refresh_from_db();self.assertFalse(account.is_active)
        self.assertFalse(AuditEvent.objects.filter(detail__contains=payload['password']).exists())

    def test_settings_cannot_disable_mandatory_controls(self):
        self.as_role('ADMIN')
        result = self.client.get('/api/operations/snapshot/').data
        values = {'acceptRequests': False, 'principalApproval': False, 'auditActions': False, 'pickupInstructions': 'Bring ID to the registrar.'}
        response = self.post('settings', {'settings': values, 'version': result['settings_version']})
        self.assertEqual(response.status_code, 200, response.data)
        prefs = Preference.objects.get(key='school').data
        self.assertFalse(prefs['principalApproval'])
        self.assertTrue(prefs['auditActions'])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/credentials/submit/', {}, format='json').status_code, 503)

    def test_invalid_references_do_not_cause_server_errors(self):
        self.as_role('PRINCIPAL')
        self.assertEqual(self.post('accounts',{'action':'deactivate','values':{'id':'bad'}}).status_code,400)
        self.as_role('ADMIN')
        self.assertEqual(self.post('issues',{'problem_type':'Other','subject':'','message':'Test'}).status_code,400)

    def test_excel_preview_then_save_and_duplicate_rejection(self):
        from openpyxl import Workbook
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        book = Workbook()
        book.active.append(["LRN", "First Name", "Last Name", "Grade", "Section"])
        book.active.append(["012345678901", "Transfer", "Student", "Grade 1", "LOVE"])
        content = BytesIO(); book.save(content)
        def preview():
            return self.client.post('/api/operations/students/preview/', {'file': SimpleUploadedFile('students.xlsx', content.getvalue())}, format='multipart')
        self.assertEqual(preview().status_code, 403)
        self.as_role('PRINCIPAL'); self.assertEqual(preview().status_code, 403)
        self.as_role('ICT'); self.assertEqual(preview().status_code, 403)
        self.as_role('ADMIN')
        response = preview()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(StudentRecord.objects.count(), 0)
        self.assertEqual(response.data['rows'][0]['lrn'], '012345678901')
        saved = self.post('students', {'action':'import', 'rows':response.data['rows']})
        self.assertEqual(saved.status_code, 200, saved.data)
        self.assertEqual(StudentRecord.objects.get().data['firstName'], 'Transfer')
        self.assertEqual(preview().status_code, 400)
        self.assertEqual(StudentRecord.objects.count(), 1)

    def test_import_parser_rejects_duplicate_and_invalid_rows(self):
        from .student_import import parse_students
        from django.core.files.uploadedfile import SimpleUploadedFile
        from rest_framework.exceptions import ValidationError
        for body in [b'LRN,First Name,Last Name\n123,A,B', b'LRN,First Name,Last Name\n123456789012,A,B\n123456789012,C,D']:
            with self.assertRaises(ValidationError):
                parse_students(SimpleUploadedFile('students.csv',body))

    def test_student_credential_preview_is_private_and_bound_to_student(self):
        import tempfile
        from unittest.mock import patch
        from io import BytesIO
        from PIL import Image
        from django.core.files.base import ContentFile
        from credentials.documents import private_storage
        from .models import StudentCredential
        with tempfile.TemporaryDirectory() as directory, patch.object(private_storage, "_location", directory):
            private_storage.__dict__.pop("location", None)
            try:
                student = StudentRecord.objects.create(lrn="000000000001", data={"firstName":"Demo"})
                file = StudentCredential(student=student, title="SF10 Permanent Record", is_sample=True)
                data = BytesIO(); Image.new("RGB", (20,20), "white").save(data, format="PNG")
                file.document.save("sample.png", ContentFile(data.getvalue()))
                url = f"/api/operations/students/{student.pk}/credentials/{file.pk}/preview/"
                self.assertEqual(self.client.get(url).status_code, 403)
                self.as_role("PRINCIPAL"); self.assertEqual(self.client.get(url).status_code,403)
                self.as_role("ADMIN")
                response = self.client.get(url)
                self.assertEqual(response.status_code,200)
                self.assertEqual(response["Content-Type"],"image/png")
                close_test_response(response)
                self.assertEqual(self.client.get(f"/api/operations/students/{student.pk+1}/credentials/{file.pk}/preview/").status_code,404)
                snapshot = self.client.get('/api/operations/snapshot/').data
                self.assertEqual(snapshot['students'][0]['credentialFiles'][0]['title'], 'SF10 Permanent Record')
                self.assertNotIn('document',snapshot['students'][0]['credentialFiles'][0])
            finally: private_storage.__dict__.pop("location", None)


def close_test_response(response):
    # Streaming responses are closed inside TestCase's outer transaction. Simulate the
    # test client's streaming wrapper so request_finished cannot close that transaction.
    from django.core.signals import request_finished
    from django.db import close_old_connections
    request_finished.disconnect(close_old_connections)
    try:
        response.close()
    finally:
        request_finished.connect(close_old_connections)
