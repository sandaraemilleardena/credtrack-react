from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import UserProfile
from .models import Preference, AuditEvent


class SchoolPinTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.principal = User.objects.create_user('pin-principal')
        UserProfile.objects.create(user=self.principal, role='PRINCIPAL')

    def change(self, **overrides):
        return self.client.post('/api/operations/school-pin/change/', {
            'current_pin':'1905', 'new_pin':'0284', 'confirm_pin':'0284', **overrides,
        }, format='json')

    def verify(self, pin):
        return self.client.post('/api/operations/school-pin/verify/', {'pin':pin}, format='json')

    def test_change_persists_hash_and_replaces_default_for_anonymous_visitors(self):
        self.assertEqual(self.verify('1905').status_code, 200)
        self.client.force_authenticate(self.principal)
        self.assertEqual(self.change().status_code, 200)
        row = Preference.objects.get(key='school-entry-pin')
        self.assertTrue(check_password('0284', row.data['hash']))
        self.assertNotIn('0284', str(row.data))
        self.assertEqual(AuditEvent.objects.filter(action='Changed school entry PIN').count(), 1)
        self.client.force_authenticate(None)
        self.assertEqual(self.verify('1905').status_code, 400)
        self.assertEqual(self.verify('0284').status_code, 200)

    def test_only_principal_can_change(self):
        self.assertIn(self.change().status_code, [401, 403])
        for role in ['ADMIN', 'TEACHER']:
            user = User.objects.create_user('pin-' + role)
            UserProfile.objects.create(user=user, role=role)
            self.client.force_authenticate(user)
            self.assertEqual(self.change().status_code, 403)

    def test_rejects_invalid_current_pin_format_and_confirmation(self):
        self.client.force_authenticate(self.principal)
        for values in [{'current_pin':'0000'}, {'new_pin':'123'}, {'confirm_pin':'9999'}, {'new_pin':'abcd'}, {'new_pin':'1905', 'confirm_pin':'1905'}]:
            self.assertEqual(self.change(**values).status_code, 400)
        self.assertFalse(Preference.objects.filter(key='school-entry-pin').exists())

    def test_verification_is_rate_limited(self):
        for _ in range(10):
            self.assertEqual(self.verify('0000').status_code, 400)
        self.assertEqual(self.verify('1905').status_code, 429)
