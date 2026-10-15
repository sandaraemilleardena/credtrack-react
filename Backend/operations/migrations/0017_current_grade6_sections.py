from django.db import migrations


def configure(apps, schema_editor):
    Grade = apps.get_model('operations', 'GradeLevel')
    Section = apps.get_model('operations', 'ClassSection')
    Preference = apps.get_model('operations', 'Preference')
    grade, _ = Grade.objects.get_or_create(name='Grade 6')
    ids = [Section.objects.get_or_create(grade_level=grade, name=name)[0].pk
           for name in ['SPJ', 'LOVE', 'HOPE', 'KINDNESS', 'PEACE']]
    Preference.objects.update_or_create(key='current-class-sections', defaults={
        'data': {'school_year': '2026-2027', 'grade_sections': {str(grade.pk): ids}}})


class Migration(migrations.Migration):
    dependencies = [('operations', '0016_monthly_attendance_summary')]
    operations = [migrations.RunPython(configure, migrations.RunPython.noop)]
