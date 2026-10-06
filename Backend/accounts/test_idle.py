from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import UserProfile
from rest_framework.test import APIClient


class IdleSessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('idle-staff', password='Idle-test-password-739!')
        UserProfile.objects.create(user=self.user, role='ADMIN')
        self.client = APIClient(enforce_csrf_checks=True)
        self.client.force_login(self.user)
        self.now = timezone.now()
        session = self.client.session
        session['last_user_activity'] = self.now.timestamp()
        session.save()

    def test_polling_does_not_extend_idle_deadline(self):
        for seconds in (300, 600, 899):
            with patch('accounts.middleware.timezone.now', return_value=self.now + timedelta(seconds=seconds)):
                response = self.client.get('/api/auth/session/')
                self.assertTrue(response.data['authenticated'])
                self.assertEqual(self.client.session['last_user_activity'], self.now.timestamp())
        with patch('accounts.middleware.timezone.now', return_value=self.now + timedelta(seconds=900)):
            self.assertFalse(self.client.get('/api/auth/session/').data['authenticated'])
            self.assertEqual(self.client.get('/api/operations/snapshot/').status_code, 403)

    def test_activity_requires_csrf_and_renews_session(self):
        self.assertEqual(self.client.post('/api/auth/activity/').status_code, 403)
        token = self.client.get('/api/auth/csrf/').data['csrfToken']
        later = self.now + timedelta(seconds=600)
        with patch('accounts.middleware.timezone.now', return_value=later):
            response = self.client.post('/api/auth/activity/', HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(self.client.session['last_user_activity'], later.timestamp())
            self.assertEqual(self.client.session.get_expiry_age(), 900)
        with patch('accounts.middleware.timezone.now', return_value=self.now + timedelta(seconds=1000)):
            self.assertTrue(self.client.get('/api/auth/session/').data['authenticated'])

    def test_late_activity_cannot_restore_session(self):
        token = self.client.get('/api/auth/csrf/').data['csrfToken']
        with patch('accounts.middleware.timezone.now', return_value=self.now + timedelta(seconds=900)):
            self.assertEqual(self.client.post('/api/auth/activity/', HTTP_X_CSRFTOKEN=token).status_code, 403)
            self.assertFalse(self.client.get('/api/auth/session/').data['authenticated'])

    def test_refresh_reports_remaining_idle_time_without_resetting_it(self):
        with patch('accounts.middleware.timezone.now', return_value=self.now + timedelta(seconds=800)):
            response = self.client.get('/api/auth/session/')
            self.assertTrue(response.data['authenticated'])
            self.assertAlmostEqual(response.data['idle_remaining_seconds'],100,delta=1)
            self.assertEqual(self.client.session['last_user_activity'],self.now.timestamp())
