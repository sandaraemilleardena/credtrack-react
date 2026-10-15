import re
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase,override_settings
from django.contrib.auth.models import User
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient
from .models import UserProfile,SecurityRateLimit

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EmailOtpTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user('otp-trial',email='southcredtrack@gmail.com',password='Trial-password-784!')
        self.profile=UserProfile.objects.create(user=self.user,role='ADMIN',email_otp_enabled=True)
        self.client=APIClient()
    def start(self):
        return self.client.post('/api/auth/login/',{'username':self.user.username,'password':'Trial-password-784!','role':'ADMIN'},format='json')
    def code(self):return re.search(r'code is: (\d{6})',mail.outbox[-1].body)[1]
    def verify(self,code,client=None):return (client or self.client).post('/api/auth/otp/verify/',{'code':code},format='json')
    def test_password_alone_does_not_authenticate_and_code_is_single_use(self):
        result=self.start();self.assertTrue(result.data['otp_required'])
        self.assertNotIn('_auth_user_id',self.client.session)
        self.assertEqual(mail.outbox[-1].to,['southcredtrack@gmail.com'])
        code=self.code()
        self.profile.refresh_from_db();self.assertNotEqual(self.profile.email_otp_state['hash'],code)
        self.assertEqual(self.verify(code).status_code,200)
        self.assertEqual(self.client.session['_auth_user_id'],str(self.user.pk))
        self.assertEqual(self.verify(code).status_code,400)
    def test_code_cannot_be_used_from_another_browser(self):
        self.start();self.assertEqual(self.verify(self.code(),APIClient()).status_code,400)
    def test_wrong_code_limit(self):
        self.start();right=self.code();wrong='000000' if right!='000000' else '111111'
        for i in range(5):self.assertEqual(self.verify(wrong).status_code,400)
        self.assertEqual(self.verify(right).status_code,400)
        self.assertNotIn('_auth_user_id',self.client.session)
    def test_expired_code(self):
        self.start();self.profile.refresh_from_db();state=self.profile.email_otp_state;state['expires']=0;self.profile.email_otp_state=state;self.profile.save()
        self.assertEqual(self.verify(self.code()).status_code,400)
    def test_resend_rate_limit_and_previous_code_invalidated(self):
        self.start();old=self.code()
        self.assertEqual(self.client.post('/api/auth/otp/resend/').status_code,429)
        SecurityRateLimit.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.client.post('/api/auth/otp/resend/').status_code,200)
        # A resend always changes the challenge nonce, invalidating the old challenge.
        self.assertEqual(len(mail.outbox),2)
        self.assertEqual(self.verify(self.code()).status_code,200)
    @patch('accounts.email_otp.send_mail',side_effect=TimeoutError)
    def test_mail_failure_never_creates_login_session(self,send):
        self.assertEqual(self.start().status_code,503)
        self.assertNotIn('_auth_user_id',self.client.session)
    def test_staff_cannot_bypass_otp_with_disabled_trial_flag(self):
        self.profile.email_otp_enabled=False;self.profile.save()
        self.assertTrue(self.start().data['otp_required'])

    def test_principal_and_teacher_require_email_code(self):
        for role in ['PRINCIPAL','TEACHER']:
            SecurityRateLimit.objects.all().delete()
            self.profile.role=role;self.profile.save()
            result=self.client.post('/api/auth/login/',{'username':self.user.username,'password':'Trial-password-784!','role':role},format='json')
            self.assertTrue(result.data['otp_required'])
            self.assertNotIn('_auth_user_id',self.client.session)
            self.assertEqual(mail.outbox[-1].to,['southcredtrack@gmail.com'])
            self.assertEqual(self.verify(self.code()).data['user']['role'],role)
            self.client.post('/api/auth/logout/')