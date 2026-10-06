import uuid
from datetime import date, time
from unittest.mock import patch
from tempfile import TemporaryDirectory
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import UserProfile
from credentials.models import CredentialRequest, SmsNotification
from credentials.documents import private_storage
from credentials.services import transition
from .models import IssueReport, StaffNotification


class FinalRevisionTests(TestCase):
    def setUp(self):
        self.client=APIClient()
        self.users={}
        for role in ['ADMIN','PRINCIPAL','ICT','STUDENTS']:
            user=User.objects.create_user(role, password='Revision-test-password-783!')
            UserProfile.objects.create(user=user,role=role)
            self.users[role]=user
        directory=TemporaryDirectory();self.addCleanup(directory.cleanup)
        storage=patch.object(private_storage,'location',directory.name);storage.start();self.addCleanup(storage.stop)
        self.item=CredentialRequest.objects.create(submission_key=uuid.uuid4(),reference='CT-TEST-00001',full_name='Example Student',lrn='123456789012',credential='SF10',purpose='Transfer',phone='+639123456789',verification_document=SimpleUploadedFile('request-form.pdf',b'Private document'))

    def test_administration_approves_principal_monitors_and_receives_notifications(self):
        self.client.force_authenticate(self.users['PRINCIPAL'])
        response=self.client.post(f'/api/credentials/{self.item.pk}/action/',{'action':'approve','version':0},format='json')
        self.assertEqual(response.status_code,403)
        item=transition(self.item.pk,self.users['ADMIN'],'approve',0)
        self.assertEqual(item.status,'APPROVED');self.assertEqual(item.approved_by,self.users['ADMIN'])
        self.assertEqual(item.confirmed_at.date(),item.approved_at.date())
        row=StaffNotification.objects.get(recipient=self.users['PRINCIPAL'])
        self.assertEqual(row.title,'Credential approved by Administration.')
        snapshot=self.client.get('/api/operations/snapshot/').data
        self.assertEqual(snapshot['requests'][0]['status'],'APPROVED')
        self.assertEqual(snapshot['statistics']['approved'],1)

    def test_notification_reads_are_owned_idempotent_and_persistent(self):
        transition(self.item.pk,self.users['ADMIN'],'approve',0)
        row=StaffNotification.objects.get(recipient=self.users['PRINCIPAL'])
        url=f'/api/operations/notifications/{row.pk}/read/'
        self.client.force_authenticate(self.users['ADMIN'])
        self.assertEqual(self.client.post(url,{},format='json').status_code,404)
        self.client.force_authenticate(self.users['PRINCIPAL'])
        self.assertEqual(self.client.post(url,{},format='json').status_code,200)
        row.refresh_from_db();saved=row.read_at
        self.assertEqual(self.client.post(url,{},format='json').status_code,200)
        row.refresh_from_db();self.assertEqual(row.read_at,saved)
        fresh=APIClient();fresh.force_login(self.users['PRINCIPAL'])
        rows=fresh.get('/api/operations/snapshot/').data['notifications']
        self.assertTrue(rows[0]['read_at'])

    def test_release_preserves_schedule_and_stats_filters_follow_state(self):
        admin=self.users['ADMIN'];item=transition(self.item.pk,admin,'approve',0)
        self.client.force_authenticate(admin)
        self.assertEqual(len(self.client.get('/api/credentials/?category=processing').data['requests']),1)
        item=transition(item.pk,admin,'ready',item.version,release_date=date(2026,10,20),release_time=time(9,30))
        item=transition(item.pk,admin,'collect',item.version)
        item.refresh_from_db();self.assertEqual(item.scheduled_release_date,date(2026,10,20));self.assertEqual(item.scheduled_release_time,time(9,30));self.assertIsNotNone(item.collected_at)
        self.assertEqual(self.client.get('/api/credentials/?status=APPROVED').data['requests'],[])
        self.assertEqual(len(self.client.get('/api/credentials/?status=RELEASED').data['requests']),1)
        stats=self.client.get('/api/operations/snapshot/').data['statistics']
        self.assertEqual((stats['pending'],stats['approved'],stats['released']),(0,0,1))
        self.assertEqual(stats['released_today'],1)
        self.assertEqual(StaffNotification.objects.filter(title='Credential released.').count(),2)

    def test_new_version_cannot_reschedule_or_duplicate_sms(self):
        from credentials.services import Conflict
        item=transition(self.item.pk,self.users['ADMIN'],'approve',0)
        item=transition(item.pk,self.users['ADMIN'],'ready',item.version,release_date=date(2026,10,20),release_time=time(9))
        with self.assertRaises(Conflict):
            transition(item.pk,self.users['ADMIN'],'ready',item.version,release_date=date(2026,10,21),release_time=time(10))
        self.assertEqual(SmsNotification.objects.count(),1)

    def test_issue_without_evidence_and_other_subject_validation(self):
        self.client.force_authenticate(self.users['ADMIN'])
        endpoint='/api/operations/issues/'
        self.assertEqual(self.client.post(endpoint,{'problem_type':'Other','message':'Details'},format='json').status_code,400)
        result=self.client.post(endpoint,{'problem_type':'Other','subject':'Unusual error','message':'Details'},format='json')
        self.assertEqual(result.status_code,201,result.data)
        item=IssueReport.objects.get(pk=result.data['id'])
        self.assertFalse(item.evidence);self.assertEqual(item.submitted_by,self.users['ADMIN']);self.assertIsNotNone(item.created_at)

    def test_issue_evidence_is_private_and_backend_only(self):
        self.client.force_authenticate(self.users['ADMIN'])
        response=self.client.post('/api/operations/issues/',{'problem_type':'System Error','message':'The page failed.','evidence':SimpleUploadedFile('screenshot.png',b'Evidence')},format='multipart')
        self.assertEqual(response.status_code,201,response.data)
        item=IssueReport.objects.get(pk=response.data['id'])
        self.assertEqual(item.evidence_name,'screenshot.png');self.assertEqual(len(item.evidence_sha256),64)
        with self.assertRaises(ValueError):_=item.evidence.url
        self.assertNotIn('evidence',response.data)
        for role in ['PRINCIPAL','ICT','STUDENTS']:
            self.client.force_authenticate(self.users[role])
            self.assertEqual(self.client.post('/api/operations/issues/',{'problem_type':'System Error','message':'Test'},format='json').status_code,403)

    def test_principal_user_access_admin_and_ict_cannot_manage_accounts(self):
        for role in ['ADMIN','ICT','STUDENTS']:
            self.client.force_authenticate(self.users[role])
            self.assertEqual(self.client.post('/api/operations/accounts/',{'action':'create','values':{}},format='json').status_code,403)
        self.client.force_authenticate(self.users['PRINCIPAL'])
        rows=self.client.get('/api/operations/snapshot/').data['accounts']
        self.assertEqual({r['role'] for r in rows},{'Administrator','Principal'})
        payload={'action':'create','values':{'username':'legacy-ict','name':'Legacy','email':'legacy@example.test','role':'ICT','password':'Revision-test-password-783!'}}
        self.assertEqual(self.client.post('/api/operations/accounts/',payload,format='json').status_code,400)

    def test_ict_cannot_login_or_keep_existing_session(self):
        self.assertEqual(self.client.post('/api/auth/login/',{'username':'ICT','password':'Revision-test-password-783!','role':'ICT'},format='json').status_code,403)
        self.client.force_login(self.users['ICT'])
        self.assertFalse(self.client.get('/api/auth/session/').data['authenticated'])

    def test_identity_files_minimum_maximum_and_private_storage(self):
        from credentials.serializers import SubmissionSerializer
        from .models import Preference
        Preference.objects.update_or_create(key='grade_sections',defaults={'data':{'Grade 10':['Sample']}})
        payload={'submission_key':str(uuid.uuid4()),'requester_type':'Student','first_name':'Test','middle_name':'Middle','last_name':'Learner','delivery_method':'ON_SITE','lrn':'123456789012','grade_level':'Grade 10','section':'Sample','credential':'SF10','purpose':'College admission','phone':'09123456789'}
        for count in [0,1,3,4]:
            data={**payload,'identity_documents':[SimpleUploadedFile(f'document-{i}.pdf',b'Private document') for i in range(count)]}
            serializer=SubmissionSerializer(data=data)
            self.assertEqual(serializer.is_valid(),1<=count<=3,serializer.errors)
        self.client.force_authenticate(None)
        response=self.client.post('/api/credentials/submit/',{**payload,'identity_documents':[SimpleUploadedFile(f'doc-{i}.pdf',b'Private') for i in range(3)]},format='multipart')
        self.assertEqual(response.status_code,201,response.data)
        item=CredentialRequest.objects.get(pk=response.data['id'])
        self.assertTrue(item.verification_document and item.psa_document and item.id_document)
        self.assertNotIn('verification_document',response.data)

    def test_tracking_requires_private_code_and_exposes_only_operational_status(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/credentials/track/',{'tracking_token':str(uuid.uuid4())},format='json').status_code,404)
        self.assertEqual(self.client.post('/api/credentials/track/',{'tracking_token':'invalid'},format='json').status_code,400)
        response=self.client.post('/api/credentials/track/',{'tracking_token':str(self.item.submission_key)},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['status'],'PENDING')
        self.assertFalse({'full_name','lrn','phone','verification_document','events'} & set(response.data))

    def test_data_migration_preserves_history_and_recovers_manual_schedule(self):
        import importlib
        from django.apps import apps
        from credentials.models import RequestEvent
        self.item.status='READY';self.item.ready_at=__import__('django.utils.timezone',fromlist=['now']).now();self.item.save()
        RequestEvent.objects.create(request=self.item,actor=self.users['ADMIN'],action='ready',to_status='READY',note='Release schedule: 2026-10-20 at 09:30 (Philippine time)')
        count=CredentialRequest.objects.count()
        importlib.import_module('operations.migrations.0004_final_workflow').migrate_workflow(apps,None)
        self.item.refresh_from_db();self.users['ICT'].refresh_from_db()
        self.assertFalse(self.users['ICT'].is_active)
        self.assertEqual(self.item.status,'APPROVED')
        self.assertEqual(self.item.scheduled_release_date,date(2026,10,20))
        self.assertEqual(self.item.scheduled_release_time,time(9,30))
        self.assertEqual(CredentialRequest.objects.count(),count)
        self.assertEqual(self.item.events.get().to_status,'READY')
        self.assertTrue(self.item.verification_document)

    def test_sms_status_sync_confirms_sent_without_resending_or_overwriting_schedule(self):
        from io import BytesIO
        from django.test import override_settings
        from credentials.sms import sync_notification_status
        item=transition(self.item.pk,self.users['ADMIN'],'approve',0)
        item=transition(item.pk,self.users['ADMIN'],'ready',item.version,release_date=date(2026,10,20),release_time=time(9,30))
        sms=SmsNotification.objects.get(request=item);sms.status='ACCEPTED';sms.provider_id='123';sms.save()
        with override_settings(SMS_PROVIDER='SEMAPHORE',SMS_ENABLED=True,SEMAPHORE_API_KEY='test-key'),patch('credentials.sms.urlopen') as provider:
            provider.return_value=BytesIO(b'[{"message_id":123,"status":"Sent"}]')
            result=sync_notification_status(sms.pk)
            self.assertIsNotNone(result.sent_at);self.assertEqual(result.provider_status,'Sent')
            self.assertEqual(provider.call_args.args[0].get_method(),'GET')
            sync_notification_status(sms.pk);self.assertEqual(provider.call_count,1)
        item.refresh_from_db();self.assertEqual(item.scheduled_release_date,date(2026,10,20))
