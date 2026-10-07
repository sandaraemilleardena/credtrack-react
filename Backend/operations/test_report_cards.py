from decimal import Decimal
from .test_sf9 import Sf9PermissionTests
from .models import TeacherAssignment,Sf9Grade,Sf9ReportCard

class ReportCardTests(Sf9PermissionTests):
    def url(self,record=None):return self.detail(record)+'card/'
    def adviser(self):TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).update(is_adviser=True)
    def post_card(self,**body):
        self.rec.refresh_from_db()
        return self.client.post(self.url(),{'version':self.rec.version,**body},format='json')
    def test_digital_grades_automatically_appear_without_sample_grades(self):
        self.as_role('TEACHER');blank=self.client.get(self.url()).data
        self.assertTrue(all(g is None for s in blank['subjects'] for g in s['terms']))
        self.assertEqual(self.save().status_code,200)
        self.as_role('ADMIN');r=self.client.get(self.url()).data
        self.assertEqual(Decimal(next(s for s in r['subjects'] if s['id']==self.math.pk)['terms'][0]['value']),85)
        self.assertFalse(r['card_editable'])
    def test_only_adviser_encodes_shared_fields_and_persistence(self):
        self.as_role('TEACHER');self.assertEqual(self.post_card(card={'school_head':'Head'}).status_code,403)
        self.adviser();r=self.post_card(card={'attendance':{'Jun':{'class_days':20,'present':19}},'term_comments':{'1':'Good progress.'}},grades=[{'subject':self.math.pk,'term':2,'value':'88'}])
        self.assertEqual(r.status_code,200,r.data)
        self.as_role('ADMIN');saved=self.client.get(self.url()).data
        self.assertEqual(saved['card']['attendance']['Jun']['present'],19)
        self.assertEqual(saved['card']['term_comments']['1'],'Good progress.')
        self.assertEqual(Sf9ReportCard.objects.get(record=self.rec).updated_by,self.users['TEACHER'])
        self.assertEqual(Decimal(next(s for s in saved['subjects'] if s['id']==self.math.pk)['terms'][1]['value']),88)
    def test_adviser_still_cannot_edit_other_subject_and_batch_rolls_back(self):
        self.as_role('TEACHER');self.adviser()
        r=self.post_card(card={'school_head':'Changed'},grades=[{'subject':self.math.pk,'term':1,'value':90},{'subject':self.english.pk,'term':2,'value':90}])
        self.assertEqual(r.status_code,403);self.assertFalse(Sf9Grade.objects.exists());self.assertFalse(Sf9ReportCard.objects.exists())
    def test_card_class_scope_and_removed_assignment(self):
        self.as_role('TEACHER');self.adviser()
        for r in self.records[1:]:self.assertEqual(self.client.get(self.url(r)).status_code,404)
        TeacherAssignment.objects.filter(teacher=self.users['TEACHER']).update(is_adviser=False)
        self.assertEqual(self.post_card(card={'school_head':'Head'}).status_code,403)
    def test_attendance_and_comment_validation(self):
        self.as_role('TEACHER');self.adviser()
        for card in [{'attendance':{'Jun':{'class_days':20,'present':21}}},{'attendance':{'Jun':{'present':1.5}}},{'attendance':{'May':{}}},{'term_comments':{'4':'Bad'}},{'admission_date':'invalid'}]:
            self.assertEqual(self.post_card(card=card).status_code,400)
        self.assertFalse(Sf9ReportCard.objects.exists())
    def test_card_unauthorized_and_stale_version(self):
        self.assertEqual(self.client.get(self.url()).status_code,403)
        self.as_role('STUDENTS');self.assertEqual(self.client.get(self.url()).status_code,403)
        self.as_role('TEACHER');self.adviser();self.save()
        self.assertEqual(self.client.post(self.url(),{'version':0,'card':{}},format='json').status_code,409)
    def test_principal_assigns_adviser_admin_cannot(self):
        assignment={'grade_level':self.g6.pk,'section':self.a.pk,'subject':self.math.pk,'is_adviser':True}
        body={'action':'edit','values':{'id':self.users['TEACHER'].pk,'name':'Class Teacher','role':'Teacher','assignment':assignment}}
        self.as_role('ADMIN');self.assertEqual(self.client.post('/api/operations/accounts/',body,format='json').status_code,403)
        self.as_role('PRINCIPAL');r=self.client.post('/api/operations/accounts/',body,format='json');self.assertEqual(r.status_code,200,r.data)
        self.assertTrue(TeacherAssignment.objects.get(teacher=self.users['TEACHER']).is_adviser)

    def test_subject_teacher_can_encode_only_own_card_grades(self):
        self.as_role('TEACHER')
        r=self.post_card(grades=[{'subject':self.math.pk,'term':1,'value':91}],card={})
        self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(self.post_card(grades=[{'subject':self.english.pk,'term':1,'value':91}],card={}).status_code,403)
        self.assertEqual(self.post_card(card={'attendance':{'Jun':{'present':1}}}).status_code,403)
