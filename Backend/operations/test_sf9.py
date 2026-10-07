from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import UserProfile
from .models import (StudentRecord,GradeLevel,ClassSection,Subject,SchoolYear,GradingTerm,TeacherAssignment,Sf9Record,Sf9Grade)
from .sf9 import sync_student

class Sf9PermissionTests(TestCase):
    def setUp(self):
        self.client=APIClient();self.users={}
        for role in ['ADMIN','PRINCIPAL','TEACHER','STUDENTS']:
            user=User.objects.create_user(role.lower(),password='Secure-sf9-test-91!')
            UserProfile.objects.create(user=user,role=role);self.users[role]=user
        self.g6=GradeLevel.objects.get(name='Grade 6');self.g5=GradeLevel.objects.get(name='Grade 5')
        self.a=ClassSection.objects.create(grade_level=self.g6,name='SPJ');self.b=ClassSection.objects.create(grade_level=self.g6,name='Other')
        self.c=ClassSection.objects.create(grade_level=self.g5,name='SPJ')
        self.math=Subject.objects.get(name='Mathematics');self.english=Subject.objects.get(name='English')
        self.year=SchoolYear.objects.create(name='2026-2027')
        self.records=[]
        for i,section in enumerate([self.a,self.b,self.c]):
            student=StudentRecord.objects.create(lrn=f'{i+1:012}',data={'firstName':'Test','lastName':f'Learner{i}','grade':section.grade_level.name,'section':section.name,'schoolYear':self.year.name,'status':'Active'})
            self.records.append(sync_student(student))
        TeacherAssignment.objects.create(teacher=self.users['TEACHER'],grade_level=self.g6,section=self.a,subject=self.math)
        self.rec=self.records[0]
    def as_role(self,role):self.client.force_authenticate(self.users[role])
    def complete_term(self,term):
        for subject in Subject.objects.all():
            Sf9Grade.objects.get_or_create(record=self.rec,subject=subject,term=GradingTerm.objects.get(number=term),defaults={'value':80})
    def detail(self,record=None):return f'/api/operations/sf9/records/{(record or self.rec).pk}/'
    def save(self,subject=None,record=None,term=1,value='85',**extra):
        r=record or self.rec;r.refresh_from_db()
        return self.client.post(self.detail(r),{'version':r.version,'grades':[{'subject':(subject or self.math).pk,'term':term,'value':value}],**extra},format='json')
    def test_admin_views_all_subjects_and_persisted_teacher_grades(self):
        self.as_role('TEACHER');self.assertEqual(self.save().status_code,200)
        self.as_role('ADMIN');r=self.client.get(self.detail()).data
        self.assertEqual(len(r['subjects']),11);self.assertFalse(any(s['editable'] for s in r['subjects']))
        m=next(s for s in r['subjects'] if s['id']==self.math.pk)
        self.assertEqual(Decimal(m['terms'][0]['value']),85);self.assertEqual(m['terms'][0]['updated_by'],'teacher')
    def test_terms_separately_saved_and_read_after_refresh(self):
        self.as_role('TEACHER')
        for n,v in [(1,'85'),(2,'88'),(3,'90')]:
            self.assertEqual(self.save(term=n,value=v).status_code,200)
            self.complete_term(n)
        r=self.client.get(self.detail()).data;m=next(s for s in r['subjects'] if s['id']==self.math.pk)
        self.assertEqual([Decimal(g['value']) for g in m['terms']],[85,88,90]);self.assertEqual(m['status'],'Complete')
        self.assertEqual(Sf9Grade.objects.filter(record=self.rec,subject=self.math).count(),3);self.assertIsNone(r['general_average'])
    def test_teacher_cannot_change_other_subject_even_with_forged_assignment(self):
        self.as_role('TEACHER');self.assertEqual(self.save(subject=self.english).status_code,403)
        self.assertEqual(self.save(assignment={'subject':self.english.pk}).status_code,400)
        self.assertFalse(Sf9Grade.objects.exists())
    def test_teacher_cannot_access_other_grade_or_section(self):
        self.as_role('TEACHER')
        for r in self.records[1:]:
            self.assertEqual(self.client.get(self.detail(r)).status_code,404)
            self.assertEqual(self.save(record=r).status_code,404)
        rows=self.client.get('/api/operations/sf9/records/').data['records'];self.assertEqual([r['id'] for r in rows],[self.rec.pk])
    def test_assignment_change_immediately_changes_access(self):
        self.as_role('ADMIN')
        r=self.client.post('/api/operations/accounts/',{'action':'edit','values':{'id':self.users['TEACHER'].pk,'name':'Assigned Teacher','role':'Teacher','assignment':{'grade_level':self.g5.pk,'section':self.c.pk,'subject':self.english.pk}}},format='json')
        self.assertEqual(r.status_code,200,r.data)
        self.as_role('TEACHER');self.assertEqual(self.save().status_code,404)
        self.assertEqual(self.save(subject=self.english,record=self.records[2]).status_code,200)
        self.assertEqual(self.save(subject=self.math,record=self.records[2]).status_code,403)
    def test_unauthorized_users_cannot_read_or_write(self):
        self.assertEqual(self.client.get(self.detail()).status_code,403)
        for role in ['PRINCIPAL','STUDENTS']:
            self.as_role(role);self.assertEqual(self.client.get(self.detail()).status_code,403);self.assertEqual(self.save().status_code,403)
    def test_teacher_cannot_modify_student_or_accounts(self):
        self.as_role('TEACHER')
        self.assertEqual(self.client.post('/api/operations/students/',{'action':'save','student':{}},format='json').status_code,403)
        self.assertEqual(self.client.post('/api/operations/accounts/',{'action':'edit','values':{'id':self.users['TEACHER'].pk,'role':'Teacher'}},format='json').status_code,403)
        self.assertEqual(self.client.post('/api/operations/sf9/catalog/',{'kind':'subject','name':'Unauthorized'},format='json').status_code,403)
    def test_validation_and_atomic_batch(self):
        self.as_role('TEACHER')
        for value in ['no','NaN','Infinity',-1,101,True,'85.123']:
            self.assertEqual(self.save(value=value).status_code,400,str(value))
        self.assertEqual(self.save(term=4).status_code,400)
        result=self.client.post(self.detail(),{'version':0,'grades':[{'subject':self.math.pk,'term':1,'value':85},{'subject':self.english.pk,'term':1,'value':90}]},format='json')
        self.assertEqual(result.status_code,403);self.assertFalse(Sf9Grade.objects.exists())
    def test_readonly_final_and_no_general_average_calculation(self):
        self.as_role('TEACHER');self.assertEqual(self.save(finals=[{'subject':self.math.pk,'value':90}]).status_code,403)
        self.as_role('ADMIN');self.assertEqual(self.save(finals=[{'subject':self.math.pk,'value':90}]).status_code,403)
        self.assertEqual(self.save().status_code,403)
        self.as_role('TEACHER')
        self.assertEqual(self.save(general_average=90).status_code,400)
        self.rec.refresh_from_db();self.assertIsNone(self.rec.general_average)
    def test_stale_version_cannot_overwrite_teacher_grade(self):
        self.as_role('TEACHER');self.assertEqual(self.save().status_code,200)
        result=self.client.post(self.detail(),{'version':0,'grades':[{'subject':self.math.pk,'term':1,'value':40}]},format='json')
        self.assertEqual(result.status_code,409);self.assertEqual(Sf9Grade.objects.get().value,85)
    def test_blank_lrns_are_independent_and_later_editable(self):
        self.as_role('ADMIN');ids=[]
        for name in ['First','Second']:
            result=self.client.post('/api/operations/students/',{'action':'save','student':{'lrn':'','firstName':name,'lastName':'Learner','grade':'Grade 6','section':'SPJ','schoolYear':'2026-2027'}},format='json')
            self.assertEqual(result.status_code,200,result.data);ids.append(StudentRecord.objects.get(data__firstName=name).pk)
        self.assertNotEqual(*ids);self.assertEqual(StudentRecord.objects.filter(lrn__isnull=True).count(),2)
    def test_admin_creates_teacher_and_assignment_validated_transactionally(self):
        self.as_role('ADMIN')
        values={'username':'teacher-new','name':'New Teacher','email':'new@example.test','password':'Random!Grade-92-test','role':'Teacher','assignment':{'grade_level':self.g6.pk,'section':self.c.pk,'subject':self.math.pk}}
        r=self.client.post('/api/operations/accounts/',{'action':'create','values':values},format='json');self.assertEqual(r.status_code,400);self.assertFalse(User.objects.filter(username='teacher-new').exists())
        values['assignment']['section']=self.a.pk
        r=self.client.post('/api/operations/accounts/',{'action':'create','values':values},format='json');self.assertEqual(r.status_code,200,r.data)
        u=User.objects.get(username='teacher-new');self.assertTrue(u.check_password(values['password']));self.assertEqual(u.teaching_assignment.subject,self.math)
        values.update(username='bad-admin',role='Principal');self.assertEqual(self.client.post('/api/operations/accounts/',{'action':'create','values':values},format='json').status_code,403)
    def test_teacher_snapshot_does_not_expose_school_requests_or_accounts(self):
        self.as_role('TEACHER');r=self.client.get('/api/operations/snapshot/');self.assertEqual(r.status_code,200,r.data);self.assertNotIn('accounts',r.data);self.assertEqual(r.data['requests'],[])
    def test_csrf_is_required_for_session_grade_writes(self):
        client=APIClient(enforce_csrf_checks=True);client.force_login(self.users['TEACHER'])
        self.assertEqual(client.post(self.detail(),{'version':0,'grades':[]},format='json').status_code,403)
    def test_teacher_login_and_refresh_session(self):
        client=APIClient();r=client.post('/api/auth/login/',{'username':'teacher','password':'Secure-sf9-test-91!','role':'TEACHER'},format='json')
        self.assertEqual(r.status_code,200,r.data);self.assertEqual(client.get('/api/auth/session/').data['user']['role'],'TEACHER')

    def test_blank_lrn_csv_preview_and_import(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.as_role('ADMIN')
        file=SimpleUploadedFile('roster.csv',b'LRN,First Name,Last Name,Grade,Section,School Year\n,Alpha,Learner,Grade 6,SPJ,2026-2027\n,Beta,Learner,Grade 6,SPJ,2026-2027\n',content_type='text/csv')
        r=self.client.post('/api/operations/students/preview/',{'file':file},format='multipart')
        self.assertEqual(r.status_code,200,r.data)
        r=self.client.post('/api/operations/students/',{'action':'import','rows':r.data['rows']},format='json');self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(StudentRecord.objects.filter(lrn__isnull=True).count(),2)
    def test_deactivation_revokes_teacher_access(self):
        self.as_role('ADMIN');r=self.client.post('/api/operations/accounts/',{'action':'deactivate','values':{'id':self.users['TEACHER'].pk}},format='json');self.assertEqual(r.status_code,200,r.data)
        self.as_role('TEACHER');self.assertEqual(self.save().status_code,404)
    def test_subject_grade_clear_is_persisted_and_terms_preserved(self):
        self.as_role('TEACHER');self.assertEqual(self.save(term=1,value=88).status_code,200)
        self.assertEqual(self.save(term=1,value='').status_code,200)
        r=self.client.get(self.detail()).data;m=next(s for s in r['subjects'] if s['id']==self.math.pk)
        self.assertIsNone(m['terms'][0]);self.assertIsNone(m['terms'][1])

    def test_admin_updates_teacher_identity_and_credentials(self):
        self.as_role('ADMIN');values={'id':self.users['TEACHER'].pk,'name':'Updated Teacher','username':'updated-teacher','email':'updated@example.test','role':'Teacher','assignment':{'grade_level':self.g6.pk,'section':self.a.pk,'subject':self.math.pk}}
        r=self.client.post('/api/operations/accounts/',{'action':'edit','values':values},format='json');self.assertEqual(r.status_code,200,r.data)
        self.users['TEACHER'].refresh_from_db();self.assertEqual(self.users['TEACHER'].username,'updated-teacher');self.assertEqual(self.users['TEACHER'].email,'updated@example.test')
        r=self.client.post('/api/operations/accounts/',{'action':'reset','values':{'id':self.users['TEACHER'].pk,'password':'New-random-sf9-91!'}},format='json');self.assertEqual(r.status_code,200,r.data)
        self.users['TEACHER'].refresh_from_db();self.assertTrue(self.users['TEACHER'].check_password('New-random-sf9-91!'))
    def test_teacher_without_assignment_has_no_records(self):
        TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).delete();self.as_role('TEACHER')
        self.assertEqual(self.client.get('/api/operations/sf9/records/').data['records'],[]);self.assertEqual(self.save().status_code,404)

    def test_comments_persist_three_terms_and_year(self):
        self.as_role('TEACHER')
        for term in [1,2,3]:
            result=self.client.post('/api/operations/sf9/comments/',{'record':self.rec.pk,'term':term,'message':f'Term {term} progress'},format='json')
            self.assertEqual(result.status_code,200,result.data)
        rows=self.client.get('/api/operations/sf9/comments/').data['records']
        self.assertEqual(len(rows),1);self.assertEqual(len(rows[0]['comments']),3)
        self.assertEqual(rows[0]['school_year'],'2026-2027')
        self.as_role('ADMIN');rows=self.client.get('/api/operations/sf9/comments/').data['records']
        self.assertEqual(len(next(r for r in rows if r['id']==self.rec.pk)['comments']),3)
    def test_comments_reject_other_class_and_grade(self):
        self.as_role('TEACHER')
        for record in self.records[1:]:
            self.assertEqual(self.client.post('/api/operations/sf9/comments/',{'record':record.pk,'term':1,'message':'Not allowed'},format='json').status_code,404)
    def test_comments_deny_non_teacher_writes_and_forged_teacher(self):
        for role in ['ADMIN','PRINCIPAL','STUDENTS']:
            self.as_role(role);self.assertEqual(self.client.post('/api/operations/sf9/comments/',{'record':self.rec.pk,'term':1,'message':'Not allowed'},format='json').status_code,403)
        self.as_role('TEACHER');self.assertEqual(self.client.post('/api/operations/sf9/comments/',{'record':self.rec.pk,'term':1,'message':'Test','teacher':99},format='json').status_code,400)
    def test_comments_validate_term_and_length_and_assignment_changes(self):
        self.as_role('TEACHER')
        for term,message in [(4,'Wrong term'),(1,'x'*2001),(1,5)]:
            self.assertEqual(self.client.post('/api/operations/sf9/comments/',{'record':self.rec.pk,'term':term,'message':message},format='json').status_code,400)
        TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).update(section=self.b)
        self.assertEqual(self.client.post('/api/operations/sf9/comments/',{'record':self.rec.pk,'term':1,'message':'Old class'},format='json').status_code,404)

    def test_sf9_and_comments_alphabetical_by_last_name(self):
        self.as_role('TEACHER')
        for first,last in [('Zoe','alvarez'),('Aaron','Zulu')]:
            student=StudentRecord.objects.create(lrn=None,data={'firstName':first,'lastName':last,'grade':'Grade 6','section':'SPJ','schoolYear':'2026-2027','status':'Active'})
            sync_student(student)
        for endpoint in ['sf9/records/','sf9/comments/']:
            result=self.client.get('/api/operations/'+endpoint)
            self.assertEqual(result.status_code,200,result.data)
            self.assertEqual([r['last_name'] for r in result.data['records']],['alvarez','Learner0','Zulu'])

    def test_whole_numbers_inc_and_all_subject_term_gates(self):
        self.as_role('TEACHER')
        for value in ['85.5','85.01',True,'INCx']:
            self.assertEqual(self.save(value=value).status_code,400)
        self.assertEqual(self.save(value='inc').status_code,200)
        self.assertEqual(self.client.get(self.detail()).data['subjects'][0]['terms'].__len__(),3)
        self.assertEqual(self.save(term=2).status_code,400)
        self.complete_term(1)
        self.assertEqual(self.save(term=2,value=0).status_code,200)
        self.assertEqual(self.save(term=3).status_code,400)
        self.complete_term(2)
        self.assertEqual(self.save(term=3,value='INC').status_code,200)
        self.assertEqual(self.save(term=2,value=99).status_code,403)
        self.assertEqual(self.save(term=1,value=91).status_code,200)
        self.assertEqual(self.save(term=1,value=92).status_code,403)
        self.assertEqual(self.save(term=1,value='').status_code,403)

    def test_both_writers_enforce_locks_and_persistent_started_term(self):
        self.as_role('TEACHER');self.complete_term(1)
        self.assertEqual(self.save(term=2,value='INC').status_code,200)
        self.assertEqual(self.save(term=2,value='').status_code,200)
        self.rec.refresh_from_db();self.assertEqual(self.rec.started_term,2)
        self.assertEqual(self.save(term=1,value=99).status_code,403)
        self.rec.refresh_from_db()
        r=self.client.post(self.detail()+'card/',{'version':self.rec.version,'grades':[{'subject':self.math.pk,'term':1,'value':'INC'}]},format='json')
        self.assertEqual(r.status_code,403)
        self.assertEqual(Sf9Grade.objects.get(record=self.rec,subject=self.math,term__number=1).value,80)

    def test_card_writer_cannot_bypass_term_gate_and_inc_resolution(self):
        self.as_role('TEACHER')
        def post(term,value):
            self.rec.refresh_from_db()
            return self.client.post(self.detail()+'card/',{'version':self.rec.version,'grades':[{'subject':self.math.pk,'term':term,'value':value}]},format='json')
        self.assertEqual(post(2,80).status_code,400)
        self.assertEqual(post(1,'INC').status_code,200)
        self.complete_term(1)
        self.assertEqual(post(2,80).status_code,200)
        self.assertEqual(post(1,'').status_code,403)
        self.assertEqual(post(1,90).status_code,200)
        self.assertEqual(post(1,91).status_code,403)
        self.assertEqual(post(2,85.5).status_code,400)

    def test_legacy_decimal_is_preserved_and_unchanged_submission_allowed(self):
        self.as_role('TEACHER')
        saved=Sf9Grade.objects.create(record=self.rec,subject=self.math,term=GradingTerm.objects.get(number=1),value=Decimal('85.25'))
        self.assertEqual(self.save(value='85.25').status_code,200)
        saved.refresh_from_db();self.assertEqual(saved.value,Decimal('85.25'))
        self.assertEqual(self.save(value='86.25').status_code,400)
        self.complete_term(1);self.assertEqual(self.save(term=2).status_code,200)
        self.assertEqual(self.save(value=86).status_code,403)
        saved.refresh_from_db();self.assertEqual(saved.value,Decimal('85.25'))

    def test_whole_number_display_in_records_and_report_card(self):
        self.as_role('TEACHER')
        for value,expected in [('96','96'),('0','0'),('100','100'),('INC','INC')]:
            self.assertEqual(self.save(value=value).status_code,200)
            for endpoint in [self.detail(),self.detail()+'card/']:
                response=self.client.get(endpoint)
                subject=next(s for s in response.data['subjects'] if s['id']==self.math.pk)
                self.assertEqual(subject['terms'][0]['value'],expected)
