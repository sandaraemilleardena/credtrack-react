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
        self.assertEqual(self.client.get('/api/operations/snapshot/').status_code, 403)
        for role in self.users:
            self.as_role(role)
            result = self.client.get('/api/operations/snapshot/')
            self.assertEqual(result.status_code, 200, result.data)
            self.assertEqual(result.data['role'], role)
            self.assertEqual('students' in result.data, role == 'ADMIN')
            self.assertEqual('accounts' in result.data, role == 'ICT')
            self.assertEqual('requests' in result.data, role != 'ICT')

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

    def test_ticket_moves_from_admin_to_ict(self):
        self.as_role('ADMIN')
        result = self.post('work', {'action': 'create-ticket', 'values': {'subject': 'SMS pending', 'description': 'Configuration needed'}})
        self.assertEqual(result.status_code, 200, result.data)
        ticket = result.data['item']
        values = {'id': ticket['id'], 'version': 0, 'status': 'Resolved', 'note': 'Confirmed provider configuration is pending; advised records staff.'}
        self.assertEqual(self.post('work', {'action': 'update-ticket', 'values': values}).status_code, 403)
        self.as_role('ICT')
        self.assertEqual(self.client.get('/api/operations/snapshot/').data['tickets'][0]['id'], ticket['id'])
        missing_note = {**values, 'note': ''}
        self.assertEqual(self.post('work', {'action': 'update-ticket', 'values': missing_note}).status_code, 400)
        self.assertEqual(self.post('work', {'action': 'update-ticket', 'values': values}).status_code, 200)
        self.assertEqual(self.post('work', {'action': 'update-ticket', 'values': values}).status_code, 409)

    def test_maintenance_overlap_and_state_rules(self):
        self.as_role('ICT')
        values = {'title': 'Test patch', 'owner': 'ICT', 'service': 'Database', 'startsAt': (timezone.now()+timedelta(days=1)).isoformat(), 'duration': 30}
        result = self.post('work', {'action': 'schedule-maintenance', 'values': values})
        self.assertEqual(result.status_code, 200, result.data)
        item = result.data['item']
        self.assertEqual(self.post('work', {'action': 'schedule-maintenance', 'values': values}).status_code, 409)
        update = {'id': item['id'], 'version': 0, 'status': 'Completed', 'notes': 'Done'}
        self.assertEqual(self.post('work', {'action': 'update-maintenance', 'values': update}).status_code, 409)
        update['status'] = 'Running'
        self.assertEqual(self.post('work', {'action': 'update-maintenance', 'values': update}).status_code, 200)
        update.update(version=1, status='Completed')
        self.assertEqual(self.post('work', {'action': 'update-maintenance', 'values': update}).status_code, 200)

    def test_staff_account_is_real_and_last_role_protected(self):
        self.as_role('ICT')
        self.assertEqual(self.post('accounts', {'action': 'deactivate', 'values': {'id': self.users['ADMIN'].pk}}).status_code, 400)
        payload = {'username': 'records2', 'name': 'Records Two', 'email': 'records2@example.test', 'role': 'Administrator', 'password': 'Test-only-random-95!abc'}
        result = self.post('accounts', {'action': 'create', 'values': payload})
        self.assertEqual(result.status_code, 200, result.data)
        account = User.objects.get(username='records2')
        self.assertTrue(account.check_password(payload['password']))
        self.assertEqual(account.userprofile.role, 'ADMIN')
        self.assertEqual(self.post('accounts', {'action': 'deactivate', 'values': {'id': account.pk}}).status_code, 200)
        account.refresh_from_db()
        self.assertFalse(account.is_active)
        self.assertFalse(AuditEvent.objects.filter(detail__contains=payload['password']).exists())

    def test_settings_cannot_disable_mandatory_controls(self):
        self.as_role('ADMIN')
        result = self.client.get('/api/operations/snapshot/').data
        values = {'acceptRequests': False, 'principalApproval': False, 'auditActions': False, 'pickupInstructions': 'Bring ID to the registrar.'}
        response = self.post('settings', {'settings': values, 'version': result['settings_version']})
        self.assertEqual(response.status_code, 200, response.data)
        prefs = Preference.objects.get(key='school').data
        self.assertTrue(prefs['principalApproval'])
        self.assertTrue(prefs['auditActions'])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/credentials/submit/', {}, format='json').status_code, 503)

    def test_invalid_references_do_not_cause_server_errors(self):
        self.as_role('ICT')
        self.assertEqual(self.post('work', {'action': 'update-ticket', 'values': {'id': 'bad'}}).status_code, 400)
        self.assertEqual(self.post('work', {'action': 'create-ticket', 'values': {'subject': 'Test', 'description': 'Test', 'requestId': 'bad'}}).status_code, 400)
        self.assertEqual(self.post('accounts', {'action': 'deactivate', 'values': {'id': 'bad'}}).status_code, 400)
