from django.db import migrations


def add_spj(apps, schema_editor):
    Grade = apps.get_model('operations', 'GradeLevel')
    Section = apps.get_model('operations', 'ClassSection')
    for grade in Grade.objects.all():
        Section.objects.get_or_create(grade_level=grade, name='SPJ')


class Migration(migrations.Migration):
    dependencies = [('operations', '0014_required_sections')]
    operations = [migrations.RunPython(add_spj, migrations.RunPython.noop)]
