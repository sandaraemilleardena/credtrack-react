from django.db import migrations

SUBJECTS=['Filipino','English','Mathematics','Science','GMRC','Araling Panlipunan','EPP','MAPEH','Music and Arts','PE and Health','Journalism']

def seed(apps,schema_editor):
    Grade=apps.get_model('operations','GradeLevel');Section=apps.get_model('operations','ClassSection')
    Subject=apps.get_model('operations','Subject');Year=apps.get_model('operations','SchoolYear')
    Term=apps.get_model('operations','GradingTerm');Student=apps.get_model('operations','StudentRecord');Record=apps.get_model('operations','Sf9Record')
    for name in ['Kindergarten']+['Grade '+str(n) for n in range(1,13)]:Grade.objects.get_or_create(name=name)
    for i,name in enumerate(SUBJECTS):Subject.objects.get_or_create(name=name,defaults={'position':i})
    for n in [1,2,3]:Term.objects.get_or_create(number=n)
    for student in Student.objects.all().iterator():
        d=student.data
        if not all(d.get(k) for k in ['grade','section','schoolYear']):continue
        grade,_=Grade.objects.get_or_create(name=d['grade'].strip())
        section,_=Section.objects.get_or_create(grade_level=grade,name=d['section'].strip())
        year,_=Year.objects.get_or_create(name=d['schoolYear'].strip().replace('–','-'))
        Record.objects.get_or_create(student=student,school_year=year,defaults={'section':section})

class Migration(migrations.Migration):
    dependencies=[('operations','0005_gradelevel_schoolyear_subject_classsection_and_more')]
    operations=[migrations.RunPython(seed,migrations.RunPython.noop)]
