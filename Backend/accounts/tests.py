from datetime import timedelta
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import UserProfile


class SessionSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user('security-test', password='Test-only-password-384!')
        UserProfile.objects.create(user=self.user, role='PRINCIPAL')
        self.payload = {'username': self.user.username, 'password': 'Test-only-password-384!', 'role': 'PRINCIPAL'}

    def token(self, client=None):
        response = (client or self.client).get('/api/auth/csrf/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        return response.json()['csrfToken']

    def sign_in(self):
        response = self.client.post('/api/auth/login/', self.payload, format='json',
                                    HTTP_X_CSRFTOKEN=self.token(), HTTP_ORIGIN='http://localhost:7787')
        self.assertEqual(response.status_code, 200, response.content)
        return response

    def test_login_rejects_missing_invalid_and_untrusted_csrf(self):
        self.assertEqual(self.client.post('/api/auth/login/', self.payload, format='json').status_code, 403)
        token = self.token()
        self.assertEqual(self.client.post('/api/auth/login/', self.payload, format='json', HTTP_X_CSRFTOKEN='x'*64).status_code, 403)
        response = self.client.post('/api/auth/login/', self.payload, format='json', HTTP_X_CSRFTOKEN=token,
                                    HTTP_ORIGIN='https://untrusted.example')
        self.assertEqual(response.status_code, 403)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])

    def test_session_survives_refresh_and_rotates_csrf(self):
        self.token()
        old_csrf = self.client.cookies['csrftoken'].value
        response = self.sign_in()
        self.assertTrue(response.cookies['sessionid']['httponly'])
        self.assertEqual(response.cookies['sessionid']['samesite'], 'Lax')
        self.assertNotEqual(old_csrf, self.client.cookies['csrftoken'].value)
        refreshed = APIClient(enforce_csrf_checks=True)
        refreshed.cookies = self.client.cookies.copy()
        for _ in range(2):
            response = refreshed.get('/api/auth/session/')
            self.assertTrue(response.json()['authenticated'])
            self.assertEqual(response.json()['user']['role'], 'PRINCIPAL')
            self.assertIn('no-store', response['Cache-Control'])
        self.assertEqual(refreshed.get('/api/operations/snapshot/').status_code, 200)

    def test_logout_destroys_server_session_and_replay_fails(self):
        self.sign_in()
        old_cookie = self.client.cookies['sessionid'].value
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, 403)
        self.assertTrue(Session.objects.filter(session_key=old_cookie).exists())
        response = self.client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=self.token())
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Session.objects.filter(session_key=old_cookie).exists())
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])
        replay = APIClient(enforce_csrf_checks=True)
        replay.cookies['sessionid'] = old_cookie
        self.assertFalse(replay.get('/api/auth/session/').json()['authenticated'])
        self.assertEqual(replay.get('/api/operations/snapshot/').status_code, 403)
        # Retrying a completed logout is safe, but still requires CSRF.
        self.assertEqual(self.client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=self.token()).status_code, 200)

    def test_anonymous_and_expired_sessions_cannot_read_protected_data(self):
        response = self.client.get('/api/operations/snapshot/')
        self.assertEqual(response.status_code, 403)
        self.assertIn('no-store', response['Cache-Control'])
        self.sign_in()
        Session.objects.filter(session_key=self.client.cookies['sessionid'].value).update(expire_date=timezone.now()-timedelta(seconds=1))
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])
        self.assertEqual(self.client.get('/api/operations/snapshot/').status_code, 403)

    def test_wrong_login_role_and_missing_profile_fail_closed(self):
        payload = {**self.payload, 'role': 'ADMIN'}
        self.assertEqual(self.client.post('/api/auth/login/', payload, format='json', HTTP_X_CSRFTOKEN=self.token()).status_code, 403)
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])
        self.sign_in()
        UserProfile.objects.filter(user=self.user).delete()
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])

    def test_disabled_account_session_is_rejected(self):
        self.sign_in()
        self.user.is_active = False
        self.user.save()
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])

    def test_mutations_require_csrf_and_server_role(self):
        self.sign_in()
        self.assertEqual(self.client.post('/api/operations/settings/', {}, format='json').status_code, 403)
        response = self.client.post('/api/operations/students/', {'action':'save'}, format='json', HTTP_X_CSRFTOKEN=self.token())
        self.assertEqual(response.status_code, 403)

    def test_cors_allowlist_and_preflight(self):
        for origin in ['http://localhost:7787', 'http://127.0.0.1:7787']:
            response = self.client.options('/api/auth/login/', HTTP_ORIGIN=origin,
                HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST', HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type,x-csrftoken')
            self.assertEqual(response['Access-Control-Allow-Origin'], origin)
            self.assertEqual(response['Access-Control-Allow-Credentials'], 'true')
            self.assertIn('x-csrftoken', response['Access-Control-Allow-Headers'])
        response = self.client.get('/api/auth/session/', HTTP_ORIGIN='https://untrusted.example')
        self.assertNotIn('Access-Control-Allow-Origin', response)

    @override_settings(SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True)
    def test_https_cookie_flags(self):
        self.assertTrue(self.client.get('/api/auth/csrf/').cookies['csrftoken']['secure'])
        self.assertTrue(self.sign_in().cookies['sessionid']['secure'])


    def test_all_protected_api_routes_reject_anonymous_and_logged_out_clients(self):
        import uuid
        identifier=uuid.uuid4()
        reads=["/api/operations/snapshot/","/api/credentials/",f"/api/credentials/{identifier}/verification/"]
        writes=["/api/operations/students/","/api/operations/settings/","/api/operations/work/","/api/operations/accounts/",f"/api/credentials/{identifier}/action/",f"/api/credentials/{identifier}/verification/upload/"]
        for phase in ["anonymous","logged_out"]:
            if phase=="logged_out":
                self.sign_in()
                self.client.post("/api/auth/logout/",HTTP_X_CSRFTOKEN=self.token())
            for url in reads:
                self.assertIn(self.client.get(url,HTTP_X_ROLE="ADMIN").status_code,[401,403],url)
            for url in writes:
                self.assertIn(self.client.post(url,{"role":"ADMIN"},format="json",HTTP_X_CSRFTOKEN=self.token()).status_code,[401,403],url)
