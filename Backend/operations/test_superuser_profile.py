from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from accounts.models import UserProfile

class SuperuserProfileTests(TestCase):
    def setUp(self):
        self.principal=User.objects.create_user('profile-principal')
        UserProfile.objects.create(user=self.principal,role='PRINCIPAL')
        self.target=User.objects.create_superuser('profile-root','root@example.com','Existing-password-912!')
        UserProfile.objects.create(user=self.target,role='ADMIN')
        self.client=APIClient()
        self.client.force_authenticate(self.principal)

    def update(self,action='edit',**extra):
        return self.client.post('/api/operations/accounts/',{'action':action,'values':{'id':str(self.target.pk),'role':'Administrator','name':'Cath Cassion','username':'updated-root','email':'cath@example.com',**extra}},format='json')

    def test_profile_details_save_without_changing_access_or_password(self):
        password=self.target.password
        self.assertEqual(self.update().status_code,200)
        self.target.refresh_from_db()
        self.assertEqual(self.target.get_full_name(),'Cath Cassion')
        self.assertEqual(self.target.email,'cath@example.com')
        self.assertEqual(self.target.username,'updated-root')
        self.assertTrue(self.target.is_superuser and self.target.is_staff and self.target.is_active)
        self.assertEqual(self.target.password,password)
        self.assertEqual(self.target.userprofile.role,'ADMIN')

    def test_superuser_role_permissions_and_destructive_actions_blocked(self):
        for kwargs in [{'role':'Teacher'},{'is_superuser':False},{'action':'deactivate'},{'action':'reset'}]:
            self.assertEqual(self.update(**kwargs).status_code,403)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_superuser and self.target.is_active)

from django.core.cache import cache

class OwnProfileTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user=User.objects.create_user('own-principal',password='Current-password-419!')
        UserProfile.objects.create(user=self.user,role='PRINCIPAL')
        self.client=APIClient()
        self.client.force_login(self.user)

    def update(self,**extra):
        return self.client.post('/api/auth/profile/',{'name':'Principal Example','username':'principal-updated','email':'principal@example.com','current_password':'Current-password-419!',**extra},format='json')

    def test_profile_and_password_update_preserves_session_and_role(self):
        response=self.update(new_password='New-unique-password-572!')
        self.assertEqual(response.status_code,200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('New-unique-password-572!'))
        self.assertEqual(self.user.userprofile.role,'PRINCIPAL')
        self.assertFalse(self.user.is_superuser)
        self.assertEqual(self.client.session['_auth_user_id'],str(self.user.pk))

    def test_wrong_password_cannot_update_profile(self):
        self.assertEqual(self.update(current_password='wrong').status_code,403)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username,'own-principal')

    def test_permission_fields_are_rejected(self):
        self.assertEqual(self.update(is_superuser=True).status_code,400)
        self.assertEqual(self.update(role='ADMIN').status_code,400)

    def test_profile_photo_is_normalized_and_saved(self):
        import base64
        from io import BytesIO
        from PIL import Image
        image=BytesIO();Image.new('RGB',(20,30),'red').save(image,format='PNG')
        photo='data:image/png;base64,'+base64.b64encode(image.getvalue()).decode('ascii')
        self.assertEqual(self.update(profile_photo=photo).status_code,200)
        self.user.userprofile.refresh_from_db()
        self.assertTrue(self.user.userprofile.profile_photo.startswith('data:image/jpeg;base64,'))
        self.assertEqual(self.update(profile_photo='').status_code,200)
        self.user.userprofile.refresh_from_db()
        self.assertEqual(self.user.userprofile.profile_photo,'')

    def test_non_image_profile_photo_is_rejected(self):
        self.assertEqual(self.update(profile_photo='data:image/svg+xml;base64,abcd').status_code,400)
