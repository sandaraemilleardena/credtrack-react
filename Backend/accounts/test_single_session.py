from django.test import TestCase,override_settings
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import UserProfile,SecurityRateLimit

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SingleStaffSessionTests(TestCase):
    def login(self,client,body):
        import re
        from django.core import mail
        SecurityRateLimit.objects.all().delete()
        result=client.post('/api/auth/login/',body,format='json')
        if result.data.get('otp_required'):
            code=re.search(r'code is: (\d{6})',mail.outbox[-1].body)[1]
            return client.post('/api/auth/otp/verify/',{'code':code},format='json')
        return result

    def setUp(self):
        cache.clear()

    def test_all_staff_roles_block_second_login_and_allow_after_logout(self):
        for role in ['PRINCIPAL','ADMIN','TEACHER']:
            with self.subTest(role=role):
                user=User.objects.create_user('single-'+role,email='southcredtrack@gmail.com',password='Session-password-739!')
                UserProfile.objects.create(user=user,role=role)
                first,second=APIClient(),APIClient()
                body={'username':user.username,'password':'Session-password-739!','role':role}
                self.assertEqual(self.login(first,body).status_code,200)
                self.assertEqual(self.login(second,body).status_code,409)
                self.assertEqual(first.get('/api/auth/session/').status_code,200)
                first.post('/api/auth/logout/')
                self.assertEqual(self.login(second,body).status_code,200)

    def test_idle_session_does_not_lock_out_next_login(self):
        user=User.objects.create_user('idle-principal',email='southcredtrack@gmail.com',password='Session-password-739!')
        UserProfile.objects.create(user=user,role='PRINCIPAL')
        first=APIClient();first.force_login(user)
        session=first.session
        session['last_user_activity']=timezone.now().timestamp()-settings.SESSION_IDLE_TIMEOUT-1
        session.save()
        second=APIClient()
        response=self.login(second,{'username':user.username,'password':'Session-password-739!','role':'PRINCIPAL'})
        self.assertEqual(response.status_code,200)

    def test_same_browser_can_reauthenticate(self):
        user=User.objects.create_user('same-admin',email='southcredtrack@gmail.com',password='Session-password-739!')
        UserProfile.objects.create(user=user,role='ADMIN')
        client=APIClient()
        body={'username':user.username,'password':'Session-password-739!','role':'ADMIN'}
        self.assertEqual(self.login(client,body).status_code,200)
        self.assertEqual(self.login(client,body).status_code,200)
