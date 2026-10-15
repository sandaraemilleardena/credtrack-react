from io import BytesIO
from unittest.mock import patch
from types import SimpleNamespace
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from credentials.sms import sms_balance
from operations.views import sms_balance as balance_view


@override_settings(SMS_PROVIDER='SEMAPHORE', SEMAPHORE_API_KEY='private-test-key')
class SemaphoreBalanceTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        persistence = patch('credentials.sms.saved_semaphore_balance', return_value=None)
        persistence.start()
        self.addCleanup(persistence.stop)

    @patch('credentials.sms.urlopen')
    def test_actual_balance_cached_and_key_private(self, provider):
        provider.return_value = BytesIO(b'{"credit_balance":"125.50"}')
        result = sms_balance()
        self.assertEqual(result['balance'], '125.50')
        self.assertEqual(result['provider'], 'Semaphore')
        self.assertTrue(result['checked_at'])
        self.assertNotIn('private-test-key', str(result))
        self.assertEqual(sms_balance(), result)
        self.assertEqual(provider.call_count, 1)
        self.assertEqual(provider.call_args.args[0].get_method(), 'GET')

    @patch('credentials.sms.urlopen')
    def test_invalid_balance_is_unavailable_and_failure_cached(self, provider):
        provider.return_value = BytesIO(b'{"credit_balance":"NaN"}')
        self.assertIsNone(sms_balance()['balance'])
        self.assertTrue(sms_balance()['error'])
        self.assertEqual(provider.call_count, 1)

    @override_settings(SEMAPHORE_API_KEY='')
    @patch('credentials.sms.urlopen')
    def test_missing_key_does_not_call_provider(self, provider):
        self.assertIsNone(sms_balance()['balance'])
        provider.assert_not_called()

    @patch('operations.views.provider_sms_balance', return_value={'balance':'10'})
    @patch('operations.views.user_role')
    def test_only_admin_can_read_credits(self, role, provider):
        for name in ['ADMIN', 'PRINCIPAL', 'TEACHER', 'ICT', 'STUDENTS']:
            role.return_value = name
            request = APIRequestFactory().get('/api/operations/sms/balance/')
            force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
            response = balance_view(request)
            self.assertEqual(response.status_code, 200 if name == 'ADMIN' else 403)
        self.assertEqual(provider.call_count, 1)

    @patch('credentials.sms.urlopen')
    def test_transient_failure_preserves_last_verified_balance(self, provider):
        from hashlib import sha256
        provider.return_value = BytesIO(b'{"credit_balance":"1010"}')
        self.assertEqual(sms_balance()['balance'], '1010')
        key = 'semaphore-balance-' + sha256(b'private-test-key').hexdigest()
        cache.delete(key)
        cache.delete(key + '-lock')
        previous = cache.get(key + '-last')
        previous['checked_at'] = '2026-01-01T00:00:00+00:00'
        cache.set(key + '-last', previous, 86400)
        provider.side_effect = TimeoutError
        result = sms_balance()
        self.assertEqual(result['balance'], '1010')
        self.assertTrue(result['error'])

    @patch('credentials.sms.urlopen')
    def test_overlapping_refresh_is_pending_without_provider_call(self, provider):
        from hashlib import sha256
        key = 'semaphore-balance-' + sha256(b'private-test-key').hexdigest()
        cache.add(key + '-lock', True, 35)
        result = sms_balance()
        self.assertTrue(result['refreshing'])
        self.assertFalse(result['error'])
        provider.assert_not_called()
