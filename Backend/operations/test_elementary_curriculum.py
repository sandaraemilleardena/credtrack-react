from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError
from .models import GradeLevel, ClassSection, Subject, SchoolYear, StudentRecord, Sf9Record, TeacherAssignment
from .sf9 import record_subjects, matching_assignments, save_assignment
from .curriculum import CURRICULUM


class ElementaryCurriculumTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('curriculum-teacher')
        self.year, _ = SchoolYear.objects.get_or_create(name='2026-2027')

    def record(self, number):
        grade = GradeLevel.objects.get(name=f'Grade {number}')
        section, _ = ClassSection.objects.get_or_create(grade_level=grade, name='Curriculum Test')
        student = StudentRecord.objects.create(lrn=f'98765432100{number}', data={})
        return Sf9Record.objects.create(student=student, section=section, school_year=self.year)

    def test_all_six_grade_subject_lists_and_order(self):
        for grade, names in CURRICULUM.items():
            self.assertEqual([s.name for s in record_subjects(self.record(grade))], names)

    def test_grade_six_uses_tle_and_grade_five_epp(self):
        self.assertIn('TLE', [s.name for s in record_subjects(self.record(6))])
        self.assertNotIn('TLE', [s.name for s in record_subjects(self.record(5))])

    def test_assignment_does_not_grant_other_grade_access(self):
        r6, r5 = self.record(6), self.record(5)
        TeacherAssignment.objects.create(teacher=self.user, grade_level=r6.section.grade_level, subject=Subject.objects.get(name='English'), school_year=self.year)
        self.assertTrue(matching_assignments(self.user, r6).exists())
        self.assertFalse(matching_assignments(self.user, r5).exists())

    def test_invalid_grade_subject_assignment_rejected(self):
        grade = GradeLevel.objects.get(name='Grade 1')
        with self.assertRaises(ValidationError):
            save_assignment(self.user, {'assignments':[{'grade_level':grade.pk, 'subject':Subject.objects.get(name='Science').pk, 'school_year':self.year.pk}]}, allow_adviser=True)
