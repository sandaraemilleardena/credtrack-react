from django.test import TestCase,override_settings
from django.contrib.auth.models import User
from django.core import mail
from rest_framework.test import APIClient
from unittest.mock import patch
from accounts.models import UserProfile
from .models import IssueReport

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',DEVELOPER_ISSUE_EMAIL='ardenadara@gmail.com')
class IssueEmailTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user('issue-admin',email='admin@example.com')
        UserProfile.objects.create(user=self.user,role='ADMIN')
        self.client=APIClient();self.client.force_authenticate(self.user)
    def submit(self):
        return self.client.post('/api/operations/issues/',{'problem_type':'SMS Problem','message':'Messages are not received.'},format='json')
    def test_issue_is_saved_and_emailed_to_developer(self):
        response=self.submit()
        self.assertEqual(response.status_code,201)
        self.assertTrue(response.data['email_sent'])
        self.assertEqual(len(mail.outbox),1)
        self.assertEqual(mail.outbox[0].to,['ardenadara@gmail.com'])
        self.assertIn('Messages are not received.',mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].reply_to,['admin@example.com'])
    @patch('operations.issues.EmailMessage.send',side_effect=TimeoutError)
    def test_email_failure_preserves_report_and_reports_failure(self,send):
        response=self.submit()
        self.assertEqual(response.status_code,201)
        self.assertFalse(response.data['email_sent'])
        self.assertEqual(IssueReport.objects.count(),1)
