from django.test import TestCase
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import UserProfile

class SingleStaffSessionTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_all_staff_roles_block_second_login_and_allow_after_logout(self):
        for role in ['PRINCIPAL','ADMIN','TEACHER']:
            with self.subTest(role=role):
                user=User.objects.create_user('single-'+role,password='Session-password-739!')
                UserProfile.objects.create(user=user,role=role)
                first,second=APIClient(),APIClient()
                body={'username':user.username,'password':'Session-password-739!','role':role}
                self.assertEqual(first.post('/api/auth/login/',body,format='json').status_code,200)
                self.assertEqual(second.post('/api/auth/login/',body,format='json').status_code,409)
                self.assertEqual(first.get('/api/auth/session/').status_code,200)
                first.post('/api/auth/logout/')
                self.assertEqual(second.post('/api/auth/login/',body,format='json').status_code,200)

    def test_idle_session_does_not_lock_out_next_login(self):
        user=User.objects.create_user('idle-principal',password='Session-password-739!')
        UserProfile.objects.create(user=user,role='PRINCIPAL')
        first=APIClient();first.force_login(user)
        session=first.session
        session['last_user_activity']=timezone.now().timestamp()-settings.SESSION_IDLE_TIMEOUT-1
        session.save()
        second=APIClient()
        response=second.post('/api/auth/login/',{'username':user.username,'password':'Session-password-739!','role':'PRINCIPAL'},format='json')
        self.assertEqual(response.status_code,200)

    def test_same_browser_can_reauthenticate(self):
        user=User.objects.create_user('same-admin',password='Session-password-739!')
        UserProfile.objects.create(user=user,role='ADMIN')
        client=APIClient()
        body={'username':user.username,'password':'Session-password-739!','role':'ADMIN'}
        self.assertEqual(client.post('/api/auth/login/',body,format='json').status_code,200)
        self.assertEqual(client.post('/api/auth/login/',body,format='json').status_code,200)
