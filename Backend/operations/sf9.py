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
from .curriculum import subject_names
from .views import staff, audit
from .models import (StudentRecord, GradeLevel, ClassSection, Subject, SchoolYear,
                     GradingTerm, TeacherAssignment, Sf9Record, Sf9Grade, Sf9FinalGrade, Preference, Sf9ReportCard)


def record_subjects(record, subjects=None):
    subjects=list(subjects if subjects is not None else Subject.objects.all())
    policy=Preference.objects.filter(key=f'sf9-subjects:{record.section_id}').first()
    if policy:
        allowed=set(policy.data['subject_ids'])
        subjects=[subject for subject in subjects if subject.pk in allowed]
    else:
        names=subject_names(record.section.grade_level.name)
        if names:
            # Keep historical graded subjects visible when adopting a new curriculum.
            used=set(record.grades.values_list('subject_id',flat=True)) | set(record.final_grades.values_list('subject_id',flat=True))
            subjects=[s for s in subjects if s.name in names or s.pk in used]
            subjects.sort(key=lambda s:names.index(s.name) if s.name in names else len(names))
    return subjects


def assignments_json(user):
    return [{'id':a.pk,'grade_level':a.grade_level_id,'section':a.section_id,
        'subject':a.subject_id,'school_year':a.school_year_id,
        'grade_name':a.grade_level.name,'section_name':a.section.name if a.section else 'All sections',
        'school_year_name':a.school_year.name if a.school_year else 'Legacy: all school years',
        'subject_name':a.subject.name,'is_adviser':a.is_adviser}
        for a in TeacherAssignment.objects.filter(teacher=user).select_related('grade_level','section','subject','school_year')]


def assignment_json(user):
    rows=assignments_json(user)
    return rows[0] if rows else None


def current_class_sections(user=None):
    from django.db.models import Q
    policy=Preference.objects.filter(key='current-class-sections').first()
    configuration=policy.data if policy else {}
    sections=ClassSection.objects.all()
    for grade,ids in configuration.get('grade_sections',{}).items():
        sections=sections.filter(~Q(grade_level_id=int(grade))|Q(pk__in=ids))
    if user is not None:
        scope=Preference.objects.filter(key=f'teacher-grade-scope:{user.pk}').first()
        if scope:sections=sections.filter(grade_level_id__in=scope.data.get('grade_ids',[]))
    return sections, configuration.get('school_year')


def matching_assignments(user, record):
    from django.db.models import Q
    return TeacherAssignment.objects.filter(teacher=user).filter(
        Q(school_year=record.school_year)|Q(school_year__isnull=True)).filter(
        grade_level=record.section.grade_level).filter(Q(section=record.section)|Q(section__isnull=True))


def save_assignment(user, values, allow_adviser=False):
    from django.db.models import Q
    rows=values.get('assignments')
    legacy=rows is None
    if isinstance(rows,list) and rows and all(isinstance(r,dict) and set(r)=={'subject'} for r in rows):
        if not allow_adviser:raise PermissionDenied('Only the Principal may assign teacher subjects.')
        subjects=[r['subject'] for r in rows]
        if any(type(s) is not int for s in subjects) or len(set(subjects))!=len(subjects):raise ValidationError('Choose distinct subjects.')
        sections,current_year=current_class_sections()
        year=get_object_or_404(SchoolYear,name=current_year)
        rows=[{'grade_level':grade.pk,'section':None,'school_year':year.pk,'subject':subject.pk} for grade in GradeLevel.objects.all() for subject in Subject.objects.filter(pk__in=subjects) if subject_names(grade.name) is None or subject.name in subject_names(grade.name)]
    if legacy: rows=[values.get('assignment')]
    if not isinstance(rows,list) or not 1<=len(rows)<=100:
        raise ValidationError('Provide 1 to 100 teaching assignments.')
    list(GradeLevel.objects.select_for_update().order_by('pk'))
    existing=list(TeacherAssignment.objects.filter(teacher=user))
    clean=[]
    for a in rows:
        if not isinstance(a,dict): raise ValidationError('Invalid assignment.')
        for key in ['grade_level','subject']:
            if type(a.get(key)) is not int: raise ValidationError('Choose a valid grade and subject.')
        for key in ['section','school_year']:
            if a.get(key) is not None and type(a[key]) is not int: raise ValidationError('Invalid assignment identifier.')
        if not legacy and not a.get('school_year'): raise ValidationError('Select a school year for every assignment.')
        grade=get_object_or_404(GradeLevel,pk=a['grade_level'])
        subject=get_object_or_404(Subject,pk=a['subject'])
        names=subject_names(grade.name)
        if names and subject.name not in names:
            raise ValidationError(f'{subject.name} is not part of the {grade.name} subject list.')
        section=get_object_or_404(ClassSection,pk=a['section']) if a.get('section') else None
        year=get_object_or_404(SchoolYear,pk=a['school_year']) if a.get('school_year') else None
        if section and section.grade_level_id!=grade.pk: raise ValidationError('Section must belong to its grade level.')
        adviser=a.get('is_adviser',False)
        if type(adviser) is not bool: raise ValidationError('Invalid adviser assignment.')
        if not allow_adviser and (adviser or any(x.is_adviser for x in existing)):
            raise PermissionDenied('Only the Principal may manage adviser assignments.')
        if adviser and not section: raise ValidationError('Advisers require a specific section.')
        for prev in clean:
            overlapping=(prev['school_year'] is None or year is None or prev['school_year']==year) and (prev['section'] is None or section is None or prev['section']==section)
            if prev['grade_level']==grade and overlapping and prev['subject']==subject:
                raise ValidationError('Duplicate or overlapping assignment.')
        if adviser and TeacherAssignment.objects.filter(section=section,is_adviser=True).exclude(teacher=user).filter(Q(school_year=year)|Q(school_year__isnull=True) if year else Q()).exists():
            raise ValidationError('This class already has an adviser for the school year.')
        if adviser and any(x['is_adviser'] and x['section']==section and (x['school_year']==year or x['school_year'] is None or year is None) for x in clean): raise ValidationError('Select adviser on only one subject row for this class/year.')
        clean.append(dict(grade_level=grade,section=section,subject=subject,school_year=year,is_adviser=adviser))
    TeacherAssignment.objects.filter(teacher=user).delete()
    TeacherAssignment.objects.bulk_create([TeacherAssignment(teacher=user,**row) for row in clean])


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
    sections,year=current_class_sections(user)
    qs=qs.filter(section__in=sections,student__data__status='Active')
    return qs.filter(school_year__name=year) if year else qs.none()


def alphabetical_records(qs):
    return qs.order_by(Lower(KeyTextTransform('lastName','student__data')),Lower(KeyTextTransform('firstName','student__data')),'school_year__name','pk')


def brief(record):
    d=record.student.data
    return {'id':record.pk,'student_id':record.student_id,'lrn':record.student.lrn,
        'name':' '.join(d.get(k,'') for k in ['firstName','middleName','lastName']).strip(),
        'last_name':d.get('lastName',''),'first_name':d.get('firstName',''),'middle_name':d.get('middleName',''),'sex':d.get('sex',''),'birthday':d.get('birthday',''),'grade':record.section.grade_level.name,'section':record.section.name,
        'school_year':record.school_year.name,'section_id':record.section_id,'school_year_id':record.school_year_id,'student_version':record.student.version,'version':record.version}


def record_json(record, user, role, subjects=None, assignment=None):
    result=brief(record); assigned=set(matching_assignments(user,record).values_list('subject_id',flat=True)) if role=='TEACHER' else set()
    finalized=Sf9ReportCard.objects.filter(record=record,issued_on__isnull=False).exists()
    if finalized: assigned=set()
    if role=='TEACHER': result['student_data']=record.student.data
    grades={(g.subject_id,g.term.number):g for g in record.grades.all()}
    finals={g.subject_id:g for g in record.final_grades.all()}
    subjects=record_subjects(record, subjects)
    complete={n:bool(subjects) and all((s.pk,n) in grades for s in subjects) for n in [1,2,3]}
    started=max(record.started_term,max((n for _,n in grades),default=1))
    result['started_term']=started
    result['term_unlocked']=[True,complete[1],complete[1] and complete[2]]
    def value(g):
        if not g: return None
        display='INC' if getattr(g,'is_incomplete',False) else str(int(g.value)) if g.value==g.value.to_integral_value() else str(g.value)
        return {'value':display,'updated_by':(g.updated_by.get_full_name() or g.updated_by.username) if g.updated_by else 'Former personnel','updated_at':g.updated_at.isoformat()}
    result['subjects']=[{'id':s.pk,'name':s.name,'editable':bool(role=='TEACHER' and s.pk in assigned),
        'terms':[value(grades.get((s.pk,n))) for n in [1,2,3]],'final':value(finals.get(s.pk)),
        'term_editable':[bool(role=='TEACHER' and s.pk in assigned and ((result['term_unlocked'][n-1] and n>=started) or (n<started and getattr(grades.get((s.pk,n)),'is_incomplete',False)))) for n in [1,2,3]],
        'status':'Complete' if all((s.pk,n) in grades and not grades[(s.pk,n)].is_incomplete for n in [1,2,3]) else 'Incomplete'} for s in subjects]
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
    policy=Preference.objects.filter(key='current-class-sections').first()
    configuration=policy.data if policy else {}
    configured=configuration.get('grade_sections',{})
    all_sections=list(ClassSection.objects.values('id','name','grade_level_id'))
    sections=[s for s in all_sections if str(s['grade_level_id']) not in configured or s['id'] in configured[str(s['grade_level_id'])]]
    if role=='TEACHER':
        allowed,_=current_class_sections(request.user)
        allowed_ids=set(allowed.values_list('pk',flat=True))
        sections=[s for s in sections if s['id'] in allowed_ids]
    current_sections=[next(s for s in sections if s['id']==sid) for ids in configured.values() for sid in ids if any(s['id']==sid for s in sections)]
    return Response({'current_school_year':configuration.get('school_year'),'current_sections':current_sections,'grade_levels':list(GradeLevel.objects.values('id','name')),
        'sections':sections,
        'subjects':list(Subject.objects.values('id','name')),
        'grade_subjects':{str(g.pk):list(Subject.objects.filter(name__in=subject_names(g.name)).values_list('pk',flat=True)) for g in GradeLevel.objects.all() if subject_names(g.name)},
        'school_years':list(SchoolYear.objects.values('id','name')),
        'assignments':assignments_json(request.user),'assignment':assignment_json(request.user),'terms':[1,2,3],'minimum':0,'maximum':100,
        'final_mode':'manual','policy_note':'Final grades may be confirmed by Administration. General average calculation is not enabled.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def records(request):
    role=staff(request,{'ADMIN','PRINCIPAL','TEACHER'})
    qs=allowed_records(request.user,role)
    if request.query_params.get('scope') == 'current':
        qs=qs.filter(school_year__name='2026-2027',student__data__status='Active',student__data__schoolYear='2026-2027')
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


def write_grades(record, rows, assignment, user):
    """Caller holds the record lock; validate the entire batch before persisting it."""
    if not isinstance(rows,list) or len(rows)>300:
        raise ValidationError('Only your three assigned subject grades may be changed.')
    if Sf9ReportCard.objects.filter(record=record,issued_on__isnull=False).exists(): raise PermissionDenied('Issued academic records are locked.')
    assigned=set(matching_assignments(user,record).values_list('subject_id',flat=True))
    saved={(g.subject_id,g.term.number):g for g in record.grades.all()}
    subjects={subject.pk for subject in record_subjects(record)}
    state={key:('INC' if g.is_incomplete else g.value) for key,g in saved.items()}
    started=max(record.started_term,max((n for _,n in state),default=1))
    changes={}
    for row in rows:
        if not isinstance(row,dict) or set(row)-{'subject','term','value'}: raise ValidationError('Invalid grade entry.')
        sid,term=row.get('subject'),row.get('term')
        if type(sid) is not int or type(term) is not int or term not in [1,2,3]: raise ValidationError('Choose a subject and Term 1, 2 or 3.')
        if sid not in assigned: raise PermissionDenied('You may edit only your assigned subject.')
        if sid not in subjects: raise ValidationError('This subject is not part of this class curriculum.')
        if (sid,term) in changes: raise ValidationError('Duplicate subject/term entry.')
        raw=row.get('value')
        value='INC' if isinstance(raw,str) and raw.strip().upper()=='INC' else numeric(raw)
        old=state.get((sid,term))
        if value!=old:
            if value is not None and value!='INC' and value!=value.to_integral_value():
                raise ValidationError('Enter a whole-number grade from 0 to 100 or INC.')
            if term<started and (old!='INC' or value in [None,'INC']):
                raise PermissionDenied('Previous numeric grades are locked. Only INC may be replaced with a number.')
        changes[(sid,term)]=value
    # Sort so request ordering cannot change the policy. Pending entries are included.
    for (sid,term),value in sorted(changes.items(),key=lambda item:item[0][1]):
        if value==state.get((sid,term)): continue
        resolving_previous_inc=term<started and state.get((sid,term))=='INC'
        if value is not None and not resolving_previous_inc and any(not subjects or any((subject,n) not in state for subject in subjects) for n in range(1,term)):
            raise ValidationError('Complete every subject in the previous terms with a number or INC first.')
        if value is None: state.pop((sid,term),None)
        else: state[(sid,term)]=value; started=max(started,term)
    # Starting a term in this batch also freezes earlier numeric entries.
    for (sid,term),value in changes.items():
        old=saved.get((sid,term))
        old_value=('INC' if old.is_incomplete else old.value) if old else None
        if term<started and old_value is not None and old_value!='INC' and value!=old_value:
            raise PermissionDenied('Previous numeric grades are locked.')
    for (sid,term),value in changes.items():
        old=saved.get((sid,term))
        if old and value==('INC' if old.is_incomplete else old.value): continue
        lookup={'record':record,'subject_id':sid,'term':GradingTerm.objects.get(number=term)}
        if value is None: Sf9Grade.objects.filter(**lookup).delete()
        else: Sf9Grade.objects.update_or_create(**lookup,defaults={'value':None if value=='INC' else value,'is_incomplete':value=='INC','updated_by':user})
    record.started_term=started


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def record_detail(request,record_id):
    from django.contrib.auth.models import User
    request.user = get_object_or_404(User.objects.select_for_update(of=('self',)).select_related('userprofile'),pk=request.user.pk,is_active=True)
    role=staff(request,{'ADMIN','PRINCIPAL','TEACHER'})
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
    write_grades(record, body.get('grades',[]), a, request.user)
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
