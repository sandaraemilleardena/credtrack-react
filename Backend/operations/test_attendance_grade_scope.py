from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from operations.models import GradeLevel,ClassSection,SchoolYear,Subject,TeacherAssignment
from accounts.models import UserProfile
from operations.monthly_attendance import classes_for

class AttendanceGradeScopeTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user('sf2-grade6')
        UserProfile.objects.create(user=self.user,role='TEACHER')
        self.grade=GradeLevel.objects.get(name='Grade 6')
        self.year,_=SchoolYear.objects.get_or_create(name='2026-2027')
        TeacherAssignment.objects.create(teacher=self.user,grade_level=self.grade,section=ClassSection.objects.get(grade_level=self.grade,name='SPJ'),subject=Subject.objects.get(name='English'),school_year=self.year)
    def test_grade_six_assignment_includes_all_current_grade_six_sections(self):
        rows=classes_for(self.user,'TEACHER')
        self.assertEqual({r['grade'] for r in rows},{'Grade 6'})
        self.assertEqual({r['section_name'] for r in rows},{'SPJ','LOVE','HOPE','PEACE','KINDNESS'})
    def test_other_grade_is_rejected_for_read_and_write(self):
        other=ClassSection.objects.get(grade_level__name='Grade 10',name='SPJ')
        client=APIClient();client.force_authenticate(self.user)
        self.assertEqual(client.get(f'/api/operations/sf2/?section={other.pk}&year={self.year.pk}').status_code,403)
        self.assertEqual(client.post('/api/operations/sf2/',{'section':other.pk,'school_year':self.year.pk,'month':6,'school_days':20,'version':0,'entries':[]},format='json').status_code,403)
    def test_unassigned_teacher_has_no_classes(self):
        TeacherAssignment.objects.filter(teacher=self.user).delete()
        self.assertEqual(classes_for(self.user,'TEACHER'),[])

    def test_saved_attendance_grades_and_comments_feed_same_sf9(self):
        TeacherAssignment.objects.filter(teacher=self.user).update(section=None)
        from operations.models import StudentRecord,Sf9Record,TeacherComment,GradingTerm
        from operations.sf9 import sync_student
        from operations.report_cards import card_json
        section=ClassSection.objects.get(grade_level=self.grade,name='LOVE')
        student=StudentRecord.objects.create(lrn='000000009991',data={'firstName':'Sync','lastName':'TESTING','grade':'Grade 6','section':'LOVE','schoolYear':'2026-2027','status':'Active'})
        record=sync_student(student)
        client=APIClient();client.force_authenticate(self.user)
        body={'section':section.pk,'school_year':self.year.pk,'month':6,'school_days':20,'version':0,'entries':[]}
        response=client.post('/api/operations/sf2/',body,format='json')
        self.assertEqual(response.status_code,200)
        # School days appear even before a student attendance value is entered.
        card=card_json(record,self.user,'TEACHER')
        self.assertEqual(card['card']['attendance']['Jun']['class_days'],20)
        self.assertIsNone(card['card']['attendance']['Jun']['present'])
        body['version']=response.data['school_days'][6]['version']
        body['entries']=[{'record':record.pk,'present':18,'version':record.version}]
        self.assertEqual(client.post('/api/operations/sf2/',body,format='json').status_code,200)
        record.refresh_from_db()
        subject=Subject.objects.get(name='English')
        response=client.post(f'/api/operations/sf9/records/{record.pk}/',{'version':record.version,'grades':[{'subject':subject.pk,'term':1,'value':'85'}]},format='json')
        self.assertEqual(response.status_code,200)
        TeacherComment.objects.create(record=record,teacher=self.user,subject=subject,term=GradingTerm.objects.get(number=1),message='Making steady progress.')
        record=Sf9Record.objects.get(pk=record.pk)
        card=card_json(record,self.user,'TEACHER')
        self.assertEqual(card['card']['attendance']['Jun'],{'class_days':20,'present':18,'absent':2})
        self.assertEqual(next(s for s in card['subjects'] if s['id']==subject.pk)['terms'][0]['value'],'85')
        self.assertEqual(card['teacher_comments'][0]['message'],'Making steady progress.')
