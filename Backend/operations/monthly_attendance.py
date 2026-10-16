"""School-provided monthly summary: school days and learner days present."""
import calendar
from datetime import date
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError,PermissionDenied
from rest_framework.response import Response
from .models import (AttendanceMonth,MonthlyAttendance,ClassSection,SchoolYear,
    TeacherAssignment,Sf9ReportCard,Preference)
from .sf9 import allowed_records,brief,alphabetical_records
from .views import staff,audit
from credentials.services import Conflict

MONTHS=[6,7,8,9,10,11,12,1,2,3,4]


def summary(record):
    result={}
    entries={entry.reporting_month_id:entry for entry in record.monthly_attendance.all()}
    for period in AttendanceMonth.objects.filter(section=record.section,school_year=record.school_year):
        entry=entries.get(period.pk)
        present=entry.present if entry else None
        result[calendar.month_abbr[period.month]]={'class_days':period.school_days,'present':present,'absent':period.school_days-present if present is not None else None}
    return result


def classes_for(user,role):
    from .sf9 import current_class_sections
    sections,current_year=current_class_sections(user)
    year=SchoolYear.objects.filter(name=current_year).first()
    if role == 'TEACHER':
        assigned=TeacherAssignment.objects.filter(teacher=user)
        if year:
            assigned=assigned.filter(Q(school_year=year)|Q(school_year__isnull=True))
        sections=sections.filter(grade_level_id__in=assigned.values('grade_level_id'))
    pairs=[(section.pk,year.pk) for section in sections] if year else []
    sections={s.pk:s for s in ClassSection.objects.select_related('grade_level')}
    years={y.pk:y for y in SchoolYear.objects.all()}
    rows=[{'section':sid,'school_year':yid,'grade':sections[sid].grade_level.name,'section_name':sections[sid].name,'school_year_name':years[yid].name} for sid,yid in sorted(set(pairs))]
    return sorted(rows,key=lambda row:(sections[row['section']].grade_level_id,row['section_name']))


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def attendance(request):
    request.user=get_object_or_404(User.objects.select_for_update(),pk=request.user.pk,is_active=True)
    role=staff(request,{'TEACHER'})
    classes=classes_for(request.user,role)
    if request.method=='POST':
        if role!='TEACHER':raise PermissionDenied('Only assigned teachers may encode attendance summaries.')
        body=request.data
        if not isinstance(body,dict) or set(body)!={'section','school_year','month','school_days','version','entries'}:raise ValidationError('Invalid monthly attendance data.')
        if any(type(body[k]) is not int for k in ['section','school_year','month','school_days','version']):raise ValidationError('Select a valid class, school year and month.')
        if not any(c['section']==body['section'] and c['school_year']==body['school_year'] for c in classes):raise PermissionDenied('This class and school year are not assigned to you.')
        section=get_object_or_404(ClassSection.objects.select_for_update(),pk=body['section'])
        year=get_object_or_404(SchoolYear,pk=body['school_year'])
        month=body['month'];days=body['school_days']
        if month not in MONTHS:raise ValidationError('Use June through April from the school-provided summary.')
        try:
            first,last=map(int,year.name.replace('–','-').split('-'))
            if last!=first+1:raise ValueError()
            reporting_date=date(first if month>=6 else last,month,1)
        except (ValueError,TypeError):raise ValidationError('School year must use consecutive YYYY-YYYY years.')
        if not 0<=days<=calendar.monthrange(reporting_date.year,month)[1]:raise ValidationError('School days must fit the selected calendar month.')
        entries=body['entries']
        if not isinstance(entries,list) or len(entries)>500:raise ValidationError('Invalid learner summary entries.')
        existing=AttendanceMonth.objects.select_for_update().filter(section=section,school_year=year,month=month).first()
        if body['version']!=(existing.version if existing else 0):raise Conflict('This attendance month changed. Reload before saving.')
        records=allowed_records(request.user,role).filter(section=section,school_year=year).select_for_update(of=('self',))
        clean=[];seen=set()
        for row in entries:
            if not isinstance(row,dict) or set(row)!={'record','present','version'} or type(row['record']) is not int or type(row['version']) is not int:raise ValidationError('Invalid learner entry.')
            if row['record'] in seen:raise ValidationError('Duplicate learner in summary.')
            seen.add(row['record']);record=get_object_or_404(records,pk=row['record'])
            if row['version']!=record.version:raise Conflict('A learner record changed. Reload before saving.')
            if Sf9ReportCard.objects.filter(record=record,issued_on__isnull=False).exists():raise PermissionDenied('An issued learner report is locked.')
            present=row['present']
            if present is not None and (type(present) is not int or not 0<=present<=days):raise ValidationError('Days present must be a whole number between zero and school days.')
            if present is not None and reporting_date>timezone.localdate():raise ValidationError('Future learner attendance cannot be entered.')
            clean.append((record,present))
        if existing and MonthlyAttendance.objects.filter(reporting_month=existing,present__gt=days).exclude(record_id__in=seen).exists():raise ValidationError('School days cannot be less than saved learner days present.')
        # Class totals affect all linked report cards; issued cards retain an immutable snapshot.
        period=existing or AttendanceMonth(section=section,school_year=year,month=month)
        period.school_days=days;period.version+=1;period.updated_by=request.user;period.save()
        for record,present in clean:
            if present is None:MonthlyAttendance.objects.filter(record=record,reporting_month=period).delete()
            else:MonthlyAttendance.objects.update_or_create(record=record,reporting_month=period,defaults={'present':present,'updated_by':request.user})
            record.version+=1;record.save(update_fields=['version','updated_at'])
        audit(request,'SF2','Saved monthly attendance summary',period.pk,f'{section} / {year.name} / {calendar.month_abbr[month]}')
    selected_section=request.data.get('section') if request.method=='POST' else request.query_params.get('section')
    selected_year=request.data.get('school_year') if request.method=='POST' else request.query_params.get('year')
    if not selected_section and classes:selected_section=classes[0]['section'];selected_year=classes[0]['school_year']
    if selected_section and (not str(selected_section).isdigit() or not str(selected_year).isdigit()):raise ValidationError('Invalid class filter.')
    chosen=next((c for c in classes if c['section']==int(selected_section or 0) and c['school_year']==int(selected_year or 0)),None)
    if selected_section and not chosen:raise PermissionDenied('Class is outside your authorized assignments.')
    rows=alphabetical_records(allowed_records(request.user,role).filter(section_id=selected_section,school_year_id=selected_year))[:500] if chosen else []
    periods=AttendanceMonth.objects.filter(section_id=selected_section,school_year_id=selected_year) if chosen else []
    school=Preference.objects.filter(key='school').first()
    return Response({'classes':classes,'selected':chosen,'editable':role=='TEACHER','school_name':(school.data.get('schoolName') if school else None) or 'President Manuel Roxas Memorial Integrated School South',
        'months':[{'number':m,'label':calendar.month_abbr[m].upper()} for m in MONTHS],
        'school_days':{p.month:{'value':p.school_days,'version':p.version} for p in periods},
        'records':[{**brief(r),'attendance':summary(r),'locked':Sf9ReportCard.objects.filter(record=r,issued_on__isnull=False).exists()} for r in rows], 'limit':500})
