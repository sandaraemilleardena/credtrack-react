from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import UserProfile
from .models import (GradeLevel,ClassSection,SchoolYear,Subject,TeacherAssignment,
    StudentRecord,Sf9Record,AttendanceEntry,Sf9Grade,GradingTerm,Sf9ReportCard)
from .sf9 import sync_student


class MasterRevisionTests(TestCase):
    def setUp(self):
        self.api=APIClient();self.users={}
        for role in ['ADMIN','PRINCIPAL','TEACHER','STUDENTS']:
            u=User.objects.create_user('master-'+role,password='TestSecret!123')
            UserProfile.objects.create(user=u,role=role);self.users[role]=u
        self.grade=GradeLevel.objects.get(name='Grade 6')
        self.section=ClassSection.objects.get(grade_level=self.grade,name='LOVE')
        self.other=ClassSection.objects.get(grade_level=self.grade,name='HOPE')
        self.year=SchoolYear.objects.create(name='2026-2027')
        self.old=SchoolYear.objects.create(name='2025-2026')
        self.subject=Subject.objects.first();self.subject2=Subject.objects.exclude(pk=self.subject.pk).first()
        self.assignment=TeacherAssignment.objects.create(teacher=self.users['TEACHER'],grade_level=self.grade,section=self.section,school_year=self.year,subject=self.subject)
        self.student=StudentRecord.objects.create(lrn='123456789012',data={'firstName':'A','lastName':'Learner','grade':self.grade.name,'section':self.section.name,'schoolYear':self.year.name,'status':'Active'})
        self.record=sync_student(self.student)
        self.api.force_authenticate(self.users['TEACHER'])
    def post(self,path,body):return self.api.post('/api/operations/'+path,body,format='json')
    def batch(self,status='PRESENT',record=None,day='2026-10-01'):
        return self.post('sf2/',{'date':day,'entries':[{'record':(record or self.record).pk,'status':status}]})
    def test_attendance_correction_is_unique_and_updates_readonly_sf9(self):
        self.assertEqual(self.batch().status_code,200)
        self.assertEqual(self.batch('ABSENT').status_code,200)
        self.assertEqual(AttendanceEntry.objects.count(),1)
        r=self.api.get(f'/api/operations/sf9/records/{self.record.pk}/card/').data
        self.assertEqual(r['card']['attendance']['Oct']['present'],0)
        self.assertEqual(r['card']['attendance']['Oct']['class_days'],1)
        self.assertFalse(r['card_editable']);self.assertFalse(any(s['editable'] for s in r['subjects']))
    def test_attendance_scope_and_dates(self):
        other=Sf9Record.objects.create(student=self.student,school_year=self.old,section=self.section)
        self.assertEqual(self.batch(record=other,day='2025-10-01').status_code,404)
        self.record.section=self.other;self.record.save()
        self.assertEqual(self.batch().status_code,404)
        self.record.section=self.section;self.record.save()
        for day in ['bad','2025-10-01','2099-10-01']:
            self.assertEqual(self.batch(day=day).status_code,400)
    def test_admin_principal_attendance_is_readonly(self):
        for role in ['ADMIN','PRINCIPAL']:
            self.api.force_authenticate(self.users[role]);self.assertEqual(self.batch().status_code,403)
            self.assertEqual(self.api.get('/api/operations/sf2/').status_code,200)
    def test_generated_card_rejects_all_direct_writes(self):
        for role in ['TEACHER','ADMIN','PRINCIPAL']:
            self.api.force_authenticate(self.users[role])
            self.assertEqual(self.post(f'sf9/records/{self.record.pk}/card/',{'version':0,'card':{'attendance':{}}}).status_code,403)
    def test_principal_multiple_assignments_and_subject_authorization(self):
        self.api.force_authenticate(self.users['PRINCIPAL'])
        assignments=[{'grade_level':self.grade.pk,'section':self.section.pk,'school_year':self.year.pk,'subject':s.pk} for s in [self.subject,self.subject2]]
        body={'action':'edit','values':{'id':self.users['TEACHER'].pk,'name':'Teacher','role':'Teacher','assignments':assignments}}
        r=self.post('accounts/',body);self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).count(),2)
        self.api.force_authenticate(self.users['TEACHER'])
        r=self.post(f'sf9/records/{self.record.pk}/',{'version':0,'grades':[{'subject':self.subject2.pk,'term':1,'value':88}]})
        self.assertEqual(r.status_code,200,r.data)
        third=Subject.objects.exclude(pk__in=[self.subject.pk,self.subject2.pk]).first()
        self.assertEqual(self.post(f'sf9/records/{self.record.pk}/',{'version':1,'grades':[{'subject':third.pk,'term':1,'value':88}]}).status_code,403)
        self.api.force_authenticate(self.users['PRINCIPAL'])
        body['values']['assignments'].append(assignments[0])
        self.assertEqual(self.post('accounts/',body).status_code,400)
        self.assertEqual(TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).count(),2)
    def test_teacher_enrollment_and_admin_creation_restricted(self):
        row={**self.student.data,'firstName':'New','lrn':'123456789013'}
        r=self.post('students/',{'action':'save','student':row});self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(Sf9Record.objects.count(),2)
        row['section']=self.other.name;row['lrn']='123456789014'
        self.assertEqual(self.post('students/',{'action':'save','student':row}).status_code,403)
        self.api.force_authenticate(self.users['ADMIN'])
        self.assertEqual(self.post('students/',{'action':'save','student':row}).status_code,403)
    def test_issuance_date_is_stable_and_locks_sources(self):
        Sf9Grade.objects.create(record=self.record,subject=self.subject,term=GradingTerm.objects.first(),value=88)
        self.api.force_authenticate(self.users['PRINCIPAL'])
        r=self.post(f'sf9/records/{self.record.pk}/issue/',{'version':0});self.assertEqual(r.status_code,200,r.data)
        issued=r.data['issued_on'];self.assertTrue(issued)
        self.assertEqual(self.api.get(f'/api/operations/sf9/records/{self.record.pk}/card/').data['issued_on'],issued)
        self.api.force_authenticate(self.users['TEACHER']);self.assertEqual(self.batch().status_code,403)
        self.assertEqual(self.post(f'sf9/records/{self.record.pk}/',{'version':1,'grades':[]}).status_code,403)
    def test_required_csm_schema_and_privacy(self):
        from credentials.serializers import SubmissionSerializer,RequestSerializer
        from credentials.survey import validate_responses,configuration
        from rest_framework.exceptions import ValidationError
        config=configuration()
        with self.assertRaises(ValidationError):validate_responses({'version':config['version'],'answers':{}})
        saved=validate_responses({'version':config['version'],'answers':{'placeholder_acknowledgment':'Acknowledged'}})
        self.assertEqual(saved['configuration'],config)
        self.assertTrue(SubmissionSerializer().fields['csm_responses'].required)
        self.assertNotIn('csm_responses',RequestSerializer().fields)

    def test_principal_configures_curriculum_and_survey_without_hiding_grades(self):
        self.api.force_authenticate(self.users['TEACHER'])
        self.assertEqual(self.api.get('/api/operations/academic-settings/').status_code,403)
        self.api.force_authenticate(self.users['PRINCIPAL'])
        r=self.post('academic-settings/',{'kind':'curriculum','section':self.section.pk,'subject_ids':[self.subject.pk]})
        self.assertEqual(r.status_code,200,r.data)
        self.api.force_authenticate(self.users['TEACHER'])
        r=self.api.get(f'/api/operations/sf9/records/{self.record.pk}/')
        self.assertEqual([s['id'] for s in r.data['subjects']],[self.subject.pk])
        Sf9Grade.objects.create(record=self.record,subject=self.subject,term=GradingTerm.objects.first(),value=88)
        self.api.force_authenticate(self.users['PRINCIPAL'])
        self.assertEqual(self.post('academic-settings/',{'kind':'curriculum','section':self.section.pk,'subject_ids':[self.subject2.pk]}).status_code,400)
        config={'version':'official-test-2','temporary':False,'questions':[{'id':'rating','label':'Test fixture rating','type':'rating','required':True,'min':1,'max':5}]}
        self.assertEqual(self.post('academic-settings/',{'kind':'survey','configuration':config}).status_code,200)
        from credentials.survey import validate_responses
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):validate_responses({'version':'temporary-1','answers':{}})
        self.assertEqual(validate_responses({'version':'official-test-2','answers':{'rating':4}})['answers']['rating'],4)

    def test_csm_required_submission_persistence_and_idempotency(self):
        import uuid,json,tempfile
        from unittest.mock import patch
        from django.core.files.uploadedfile import SimpleUploadedFile
        from credentials.documents import private_storage
        from credentials.models import CredentialRequest
        self.api.force_authenticate(None)
        payload={'submission_key':str(uuid.uuid4()),'requester_type':'Student','first_name':'Test','middle_name':'M','last_name':'Learner','delivery_method':'ON_SITE','lrn':'123456789012','grade_level':self.grade.name,'section':self.section.name,'credential':'SF9','purpose':'Personal record','phone':'09123456789'}
        def send():return self.api.post('/api/credentials/submit/',{**payload,'identity_documents':[SimpleUploadedFile('identity.pdf',b'Private document')]},format='multipart')
        with tempfile.TemporaryDirectory() as folder,patch.object(private_storage,'_location',folder):
            private_storage.__dict__.pop('location',None)
            try:
                self.assertEqual(send().status_code,400)
                self.assertFalse(CredentialRequest.objects.exists())
                payload['csm_responses']=json.dumps({'version':'temporary-1','answers':{'placeholder_acknowledgment':'Acknowledged'}})
                response=send();self.assertEqual(response.status_code,201,response.data)
                self.assertNotIn('csm_responses',response.data)
                self.assertEqual(send().status_code,200)
                self.assertEqual(CredentialRequest.objects.count(),1)
                self.assertEqual(CredentialRequest.objects.get().csm_responses['answers']['placeholder_acknowledgment'],'Acknowledged')
            finally:private_storage.__dict__.pop('location',None)


class MonthlySummaryTests(MasterRevisionTests):
    def test_monthly_summary_saves_and_feeds_sf9(self):
        from .models import MonthlyAttendance
        body={'section':self.section.pk,'school_year':self.year.pk,'month':7,'school_days':23,'version':0,'entries':[{'record':self.record.pk,'present':22,'version':0}]}
        r=self.post('sf2/',body)
        self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(MonthlyAttendance.objects.get().present,22)
        card=self.api.get(f'/api/operations/sf9/records/{self.record.pk}/card/').data
        self.assertEqual(card['card']['attendance']['Jul'],{'class_days':23,'present':22,'absent':1})
        self.assertEqual(self.post('sf2/',body).status_code,409)
        self.api.force_authenticate(self.users['ADMIN'])
        self.assertEqual(self.api.get('/api/operations/sf2/').status_code,403)


class SharedTeacherAccessTests(MasterRevisionTests):
    def test_shared_class_access_preserves_subject_restrictions(self):
        learner=StudentRecord.objects.create(data={**self.student.data,'lastName':'Second','section':self.other.name})
        second=sync_student(learner)
        result=self.api.get('/api/operations/sf9/records/')
        self.assertEqual(result.status_code,200,result.data)
        self.assertIn(second.pk,[r['id'] for r in result.data['records']])
        self.assertEqual(self.post(f'sf9/records/{second.pk}/',{'version':0,'grades':[{'subject':self.subject2.pk,'term':1,'value':90}]}).status_code,403)
        self.assertEqual(self.post(f'sf9/records/{second.pk}/',{'version':0,'grades':[{'subject':self.subject.pk,'term':1,'value':90}]}).status_code,200)
        self.api.force_authenticate(self.users['PRINCIPAL'])
        response=self.post('accounts/',{'action':'edit','values':{'id':self.users['TEACHER'].pk,'name':'Teacher','role':'Teacher','assignments':[{'subject':self.subject.pk},{'subject':self.subject2.pk}]}})
        self.assertEqual(response.status_code,200,response.data)
        self.api.force_authenticate(self.users['TEACHER'])
        second.refresh_from_db()
        self.assertEqual(self.post(f'sf9/records/{second.pk}/',{'version':second.version,'grades':[{'subject':self.subject2.pk,'term':1,'value':91}]}).status_code,200)
        from .monthly_attendance import classes_for
        self.assertTrue(any(c['section']==self.other.pk for c in classes_for(self.users['TEACHER'],'TEACHER')))


class CommentCompletionTests(MasterRevisionTests):
    def test_term_completion_requires_comments_and_locks_api(self):
        body={'action':'complete','section':self.section.pk,'year':self.year.pk,'term':1}
        self.assertEqual(self.post('sf9/comments/',body).status_code,400)
        comment={'record':self.record.pk,'term':1,'message':'Excellent progress.'}
        self.assertEqual(self.post('sf9/comments/',comment).status_code,200)
        self.assertEqual(self.post('sf9/comments/',body).status_code,200)
        comment['message']='Changed'
        self.assertEqual(self.post('sf9/comments/',comment).status_code,403)
        comment['term']=2
        self.assertEqual(self.post('sf9/comments/',comment).status_code,200)
        response=self.api.get('/api/operations/sf9/comments/')
        self.assertEqual(response.data['records'][0]['locked_terms'],[1])
