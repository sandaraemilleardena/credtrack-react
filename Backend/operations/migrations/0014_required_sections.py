from django.db import migrations


def add_sections(apps,schema_editor):
    Grade=apps.get_model('operations','GradeLevel')
    Section=apps.get_model('operations','ClassSection')
    Preference=apps.get_model('operations','Preference')
    for grade in Grade.objects.all():
        for name in ['LOVE','PEACE','KINDNESS','HOPE']:
            Section.objects.get_or_create(grade_level=grade,name=name)
    policy=Preference.objects.filter(key='grade_sections').first()
    if policy:
        data=dict(policy.data)
        for grade in Grade.objects.all():
            data[grade.name]=list(dict.fromkeys([*data.get(grade.name,[]),'LOVE','PEACE','KINDNESS','HOPE']))
        policy.data=data;policy.save()


class Migration(migrations.Migration):
    dependencies=[('operations','0013_attendanceentry_and_more'),('credentials','0010_credentialrequest_csm_responses')]
    operations=[migrations.RunPython(add_sections,migrations.RunPython.noop)]
