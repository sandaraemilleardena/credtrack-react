from django.db import migrations


def seed(apps, schema_editor):
    Subject = apps.get_model('operations', 'Subject')
    for name in ['Language', 'Reading and Literacy', 'Makabansa', 'TLE']:
        Subject.objects.get_or_create(name=name, defaults={'position': Subject.objects.count()})


class Migration(migrations.Migration):
    dependencies = [('operations', '0017_current_grade6_sections')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
