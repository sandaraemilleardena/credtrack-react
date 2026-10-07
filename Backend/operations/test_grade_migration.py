from decimal import Decimal

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class GradeMigrationTests(TransactionTestCase):
    def test_preserves_existing_values_and_restores_started_terms(self):
        executor=MigrationExecutor(connection)
        latest=executor.loader.graph.leaf_nodes()
        previous=[('operations','0011_teacherassignment_one_adviser_per_section_and_more')]
        executor.migrate(previous)
        try:
            apps=executor.loader.project_state(previous).apps
            grade,_=apps.get_model('operations','GradeLevel').objects.get_or_create(name='Migration grade')
            section=apps.get_model('operations','ClassSection').objects.create(grade_level=grade,name='Migration')
            year=apps.get_model('operations','SchoolYear').objects.create(name='Migration year')
            student=apps.get_model('operations','StudentRecord').objects.create(data={})
            record=apps.get_model('operations','Sf9Record').objects.create(student=student,section=section,school_year=year)
            subject,_=apps.get_model('operations','Subject').objects.get_or_create(name='Migration subject')
            term,_=apps.get_model('operations','GradingTerm').objects.get_or_create(number=3)
            saved=apps.get_model('operations','Sf9Grade').objects.create(record=record,subject=subject,term=term,value=Decimal('87.25'))
            executor=MigrationExecutor(connection)
            executor.migrate(latest)
            apps=executor.loader.project_state(latest).apps
            migrated=apps.get_model('operations','Sf9Grade').objects.get(pk=saved.pk)
            self.assertEqual(migrated.value,Decimal('87.25'))
            self.assertFalse(migrated.is_incomplete)
            self.assertEqual(apps.get_model('operations','Sf9Record').objects.get(pk=record.pk).started_term,3)
        finally:
            MigrationExecutor(connection).migrate(latest)
