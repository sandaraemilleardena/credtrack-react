"""Centralized SF9 data. Every write is authorized against the saved teacher assignment."""
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from django.db.models.functions import Lower
from django.db.models.fields.json import KeyTextTransform
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from credentials.services import Conflict
from .views import staff, audit
from .models import (StudentRecord, GradeLevel, ClassSection, Subject, SchoolYear,
                     GradingTerm, TeacherAssignment, Sf9Record, Sf9Grade, Sf9FinalGrade)


def assignment_json(user):
    a = TeacherAssignment.objects.select_related('grade_level','section','subject').filter(teacher=user).first()
    return None if not a else {'grade_level':a.grade_level_id,'section':a.section_id,'subject':a.subject_id,
        'grade_name':a.grade_level.name,'section_name':a.section.name if a.section else 'All sections', 'subject_name':a.subject.name,'is_adviser':a.is_adviser}


def save_assignment(user, values, allow_adviser=False):
    a = values.get('assignment')
    if not isinstance(a,dict): raise ValidationError('Assign a grade level and subject to the teacher.')
    if type(a.get('grade_level')) is not int or type(a.get('subject')) is not int or (a.get('section') is not None and type(a.get('section')) is not int): raise ValidationError('Select valid assignment identifiers.')
    grade = get_object_or_404(GradeLevel, pk=a.get('grade_level'))
    subject = get_object_or_404(Subject, pk=a.get('subject'))
    section = get_object_or_404(ClassSection, pk=a['section']) if a.get('section') else None
    if section and section.grade_level_id != grade.pk: raise ValidationError('Section must belong to the assigned grade level.')
    previous=TeacherAssignment.objects.filter(teacher=user).first()
    adviser=a.get('is_adviser',previous.is_adviser if previous else False)
    if type(adviser) is not bool: raise ValidationError('Invalid adviser assignment.')
    if not allow_adviser and (adviser or (previous and previous.is_adviser)): raise PermissionDenied('Only the Principal may manage class adviser assignments.')
    if adviser and not section: raise ValidationError('Assign a specific section to the class adviser.')
    if adviser and TeacherAssignment.objects.filter(grade_level=grade,section=section,is_adviser=True).exclude(teacher=user).exists(): raise ValidationError('This class already has an adviser. Update the current adviser first.')
    from django.db import IntegrityError, transaction
    try:
        with transaction.atomic():
            TeacherAssignment.objects.update_or_create(teacher=user, defaults={'grade_level':grade,'section':section,'subject':subject,'is_adviser':adviser})
    except IntegrityError:
        raise ValidationError('This class already has an adviser.')


def sync_student(student):
    """Use existing student data; never invent an LRN, class, school year or grade."""
    d = student.data
    if not all(d.get(k) for k in ['grade','section','schoolYear']): return None
    grade,_ = GradeLevel.objects.get_or_create(name=d['grade'].strip())
    section,_ = ClassSection.objects.get_or_create(grade_level=grade,name=d['section'].strip())
    year,_ = SchoolYear.objects.get_or_create(name=d['schoolYear'].strip().replace('–','-'))
    record,created = Sf9Record.objects.get_or_create(student=student,school_year=year,defaults={'section':section})
    if not created and record.section_id != section.pk:
        record.section=section; record.version+=1; record.save()
    return record


def allowed_records(user, role):
    qs = Sf9Record.objects.select_related('student','section__grade_level','school_year').prefetch_related(Prefetch('grades',queryset=Sf9Grade.objects.select_related('term','updated_by')),Prefetch('final_grades',queryset=Sf9FinalGrade.objects.select_related('updated_by')))
    if role != 'TEACHER': return qs
    a = TeacherAssignment.objects.filter(teacher=user).first()
    if not a: return qs.none()
    qs=qs.filter(section__grade_level=a.grade_level, student__data__status='Active')
    return qs.filter(section=a.section) if a.section_id else qs


def alphabetical_records(qs):
    return qs.order_by(Lower(KeyTextTransform('lastName','student__data')),Lower(KeyTextTransform('firstName','student__data')),'school_year__name','pk')


def brief(record):
    d=record.student.data
    return {'id':record.pk,'student_id':record.student_id,'lrn':record.student.lrn,
        'name':' '.join(d.get(k,'') for k in ['firstName','middleName','lastName']).strip(),
        'last_name':d.get('lastName',''),'first_name':d.get('firstName',''),'middle_name':d.get('middleName',''),'sex':d.get('sex',''),'birthday':d.get('birthday',''),'grade':record.section.grade_level.name,'section':record.section.name,
        'school_year':record.school_year.name,'version':record.version}


def record_json(record, user, role, subjects=None, assignment=None):
    result=brief(record); a=(assignment or TeacherAssignment.objects.filter(teacher=user).first()) if role=='TEACHER' else None
    grades={(g.subject_id,g.term.number):g for g in record.grades.all()}
    finals={g.subject_id:g for g in record.final_grades.all()}
    def value(g):
        return None if not g else {'value':str(g.value),'updated_by':(g.updated_by.get_full_name() or g.updated_by.username) if g.updated_by else 'Former personnel','updated_at':g.updated_at.isoformat()}
    result['subjects']=[{'id':s.pk,'name':s.name,'editable':bool(role=='TEACHER' and a and a.subject_id==s.pk),
        'terms':[value(grades.get((s.pk,n))) for n in [1,2,3]],'final':value(finals.get(s.pk)),
        'status':'Complete' if all((s.pk,n) in grades for n in [1,2,3]) else 'Incomplete'} for s in (subjects if subjects is not None else Subject.objects.all())]
    result['general_average']=str(record.general_average) if record.general_average is not None else None
    result['final_mode']='School-confirmed final grades; no automatic formula configured.'
    return result


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def catalog(request):
    role=staff(request,{'ADMIN','PRINCIPAL','TEACHER'})
    if request.method=='POST':
        staff(request,{'ADMIN','PRINCIPAL'})
        name=request.data.get('name')
        if not isinstance(name,str) or not name.strip() or len(name)>80: raise ValidationError('Enter a name of up to 80 characters.')
        kind=request.data.get('kind')
        if kind=='section':
            if type(request.data.get('grade_level')) is not int: raise ValidationError('Select a valid grade level.')
            ClassSection.objects.get_or_create(grade_level=get_object_or_404(GradeLevel,pk=request.data['grade_level']),name=name.strip())
        elif kind=='subject': Subject.objects.get_or_create(name=name.strip(),defaults={'position':Subject.objects.count()})
        else: raise ValidationError('Choose section or subject.')
        audit(request,'SF9','Created '+kind,detail=name.strip())
    return Response({'grade_levels':list(GradeLevel.objects.values('id','name')),
        'sections':list(ClassSection.objects.values('id','name','grade_level_id')),
        'subjects':list(Subject.objects.values('id','name')),'school_years':list(SchoolYear.objects.values('id','name')),
        'assignment':assignment_json(request.user),'terms':[1,2,3],'minimum':0,'maximum':100,
        'final_mode':'manual','policy_note':'Final grades may be confirmed by Administration. General average calculation is not enabled.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def records(request):
    role=staff(request,{'ADMIN','TEACHER'})
    qs=allowed_records(request.user,role)
    if request.query_params.get('student_id'):
        if not request.query_params['student_id'].isdigit(): raise ValidationError('Invalid student identifier.')
        qs=qs.filter(student_id=request.query_params['student_id'])
    for key,field in [('year','school_year_id'),('section','section_id'),('grade','section__grade_level_id')]:
        v=request.query_params.get(key)
        if v:
            if not v.isdigit(): raise ValidationError('Invalid class filter.')
            qs=qs.filter(**{field:int(v)})
    subjects=list(Subject.objects.all());assignment=TeacherAssignment.objects.filter(teacher=request.user).first() if role=='TEACHER' else None
    return Response({'records':[record_json(r,request.user,role,subjects,assignment) for r in alphabetical_records(qs)[:500]], 'limit':500})


def numeric(value):
    if value is None or value=='': return None
    if isinstance(value,bool) or not isinstance(value,(str,int,float)): raise ValidationError('Enter a numeric grade.')
    try: n=Decimal(str(value))
    except InvalidOperation: raise ValidationError('Enter a numeric grade.')
    if not n.is_finite() or n<0 or n>100 or n.as_tuple().exponent < -2: raise ValidationError('Grades must be 0–100 with at most two decimal places.')
    return n


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def record_detail(request,record_id):
    from django.contrib.auth.models import User
    request.user = get_object_or_404(User.objects.select_for_update(of=('self',)).select_related('userprofile'),pk=request.user.pk,is_active=True)
    role=staff(request,{'ADMIN','TEACHER'})
    # Lock the authoritative assignment before any grade writes. Account edits lock it too.
    a=TeacherAssignment.objects.select_for_update().filter(teacher=request.user).first() if role=='TEACHER' else None
    record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=record_id)
    if request.method=='GET': return Response(record_json(record,request.user,role))
    if role != 'TEACHER': raise PermissionDenied('Grade entry is restricted to the assigned teacher. Administration has read-only access.')
    body=request.data
    if not isinstance(body,dict): raise ValidationError('Invalid grade data.')
    if set(body)-{'version','grades','finals'}: raise ValidationError('Student information and assignments cannot be modified here.')
    if role=='TEACHER' and ('finals' in body or 'general_average' in body): raise PermissionDenied('Only Administration can confirm final grades.')
    if type(body.get('version')) is not int or body['version']!=record.version: raise Conflict('SF9 changed. Refresh before saving your grades.')
    rows=body.get('grades',[])
    if not isinstance(rows,list) or len(rows)>300: raise ValidationError('Invalid grade entries.')
    seen=set()
    for row in rows:
        if not isinstance(row,dict) or set(row)-{'subject','term','value'}: raise ValidationError('Invalid grade entry.')
        sid,term=row.get('subject'),row.get('term')
        if type(sid) is not int or type(term) is not int or term not in [1,2,3]: raise ValidationError('Choose a subject and Term 1, 2 or 3.')
        if (sid,term) in seen: raise ValidationError('Duplicate subject/term entry.')
        seen.add((sid,term))
        if role=='TEACHER' and (not a or sid!=a.subject_id): raise PermissionDenied('You may edit only your assigned subject.')
        subject=get_object_or_404(Subject,pk=sid);t=get_object_or_404(GradingTerm,number=term);n=numeric(row.get('value'))
        lookup={'record':record,'subject':subject,'term':t}
        if n is None: Sf9Grade.objects.filter(**lookup).delete()
        else: Sf9Grade.objects.update_or_create(**lookup,defaults={'value':n,'updated_by':request.user})
    if role=='ADMIN':
        finals=body.get('finals',[])
        if not isinstance(finals,list) or len(finals)>100: raise ValidationError('Invalid final grades.')
        for row in finals:
            if not isinstance(row,dict) or type(row.get('subject')) is not int: raise ValidationError('Invalid final grade.')
            subject=get_object_or_404(Subject,pk=row['subject']);n=numeric(row.get('value'))
            lookup={'record':record,'subject':subject}
            if n is None: Sf9FinalGrade.objects.filter(**lookup).delete()
            else: Sf9FinalGrade.objects.update_or_create(**lookup,defaults={'value':n,'updated_by':request.user})

    record.version+=1;record.save()
    record._prefetched_objects_cache = {}
    audit(request,'SF9','Saved SF9 grades',record.pk,('Assigned subject: '+a.subject.name) if a else 'Administration updated SF9 grades.')
    return Response(record_json(record,request.user,role))
