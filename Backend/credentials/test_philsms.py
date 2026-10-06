import json
from io import BytesIO
from unittest.mock import patch
from django.core.cache import cache
from django.test import TestCase, override_settings
from credentials.models import SmsNotification
from credentials.sms import send_notification, philsms_balance, sync_notification_status
from operations import test_final_revision

@override_settings(SMS_PROVIDER='PHILSMS',PHILSMS_ENABLED=True,PHILSMS_API_TOKEN='test-token',PHILSMS_SENDER_ID='PhilSMS')
class PhilSmsTests(TestCase):
    def setUp(self):
        test_final_revision.FinalRevisionTests.setUp(self)
        cache.clear()
    def notice(self):
        return SmsNotification.objects.create(request=self.item,phone='+639123456789',message='Release notice')
    @patch('credentials.sms.urlopen')
    def test_provider_send_claim_and_real_balance_invalidation(self, provider):
        cache.set('philsms-balance',{'balance':'10'})
        provider.return_value=BytesIO(b'{"status":"success","data":{"uid":"abc123","status":"Queued"}}')
        notice=self.notice();send_notification(notice.pk);send_notification(notice.pk)
        self.assertEqual(provider.call_count,1)
        notice.refresh_from_db();self.assertEqual(notice.provider,'PHILSMS');self.assertEqual(notice.status,'ACCEPTED')
        self.assertIsNotNone(notice.accepted_at);self.assertIsNone(notice.sent_at);self.assertIsNone(cache.get('philsms-balance'))
        request=provider.call_args.args[0]
        self.assertEqual(json.loads(request.data)['type'],'plain')
    @patch('credentials.sms.urlopen',side_effect=TimeoutError)
    def test_uncertain_outcome_is_never_retried(self,provider):
        notice=self.notice();send_notification(notice.pk);send_notification(notice.pk)
        notice.refresh_from_db();self.assertEqual(notice.status,'UNKNOWN');self.assertEqual(provider.call_count,1)
    @patch('credentials.sms.philsms_request')
    def test_balance_is_provider_value_cached_and_admin_only(self,provider):
        provider.return_value={'status':'success','data':{'remaining_balance':'23.50'}}
        self.client.force_authenticate(self.users['ADMIN']);response=self.client.get('/api/operations/sms/balance/')
        self.assertEqual(response.data['balance'],'23.50');self.assertNotIn('test-token',str(response.data))
        philsms_balance();self.assertEqual(provider.call_count,1)
        self.client.force_authenticate(self.users['PRINCIPAL']);self.assertEqual(self.client.get('/api/operations/sms/balance/').status_code,403)
    @patch('credentials.sms.philsms_request',return_value={'status':'error','message':'Unauthenticated.'})
    def test_invalid_token_never_shows_fake_zero(self,provider):
        result=philsms_balance();self.assertIsNone(result['balance']);self.assertTrue(result['error'])
    @patch('credentials.sms.philsms_request',return_value={'status':'success','data':{'uid':'abc123','status':'Sent'}})
    def test_status_refresh_is_get_only(self,provider):
        notice=self.notice();notice.provider='PHILSMS';notice.provider_id='abc123';notice.status='ACCEPTED';notice.save()
        sync_notification_status(notice.pk);notice.refresh_from_db();self.assertIsNotNone(notice.sent_at)
        provider.assert_called_once_with('sms/abc123')

    @patch('credentials.sms.philsms_request',return_value={'status':'success','data':{'remaining_balance':'\u20b1285'}})
    def test_account_endpoint_peso_balance_is_parsed(self,provider):
        self.assertEqual(philsms_balance()['balance'],'285')
