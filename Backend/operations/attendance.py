"""Daily SF2 entries are the authoritative source for SF9 attendance."""
import calendar
from datetime import date
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from .models import AttendanceEntry, Sf9ReportCard
from .sf9 import allowed_records, brief
from .views import staff, audit


def school_date(value, year):
    try:
        day=date.fromisoformat(value)
        first,last=map(int,year.name.replace('–','-').split('-'))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError('Use a valid date and a YYYY-YYYY school year.')
    if last!=first+1 or not date(first,6,1)<=day<=date(last,5,31):
        raise ValidationError('Date must fall within the June–May school year.')
    if day>timezone.localdate(): raise ValidationError('Future attendance cannot be recorded.')
    return day


def summary(record):
    result={}
    for entry in record.attendance_entries.all():
        month=calendar.month_abbr[entry.date.month]
        row=result.setdefault(month,{'class_days':0,'present':0,'absent':0,'late':0,'excused':0})
        row['class_days']+=1
        row['present']+=int(entry.status in ['PRESENT','LATE'])
        row['absent']+=int(entry.status in ['ABSENT','EXCUSED'])
        row['late']+=int(entry.status=='LATE')
        row['excused']+=int(entry.status=='EXCUSED')
    return result


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def attendance(request):
    from django.contrib.auth.models import User
    request.user=get_object_or_404(User.objects.select_for_update(),pk=request.user.pk,is_active=True)
    role=staff(request,{'TEACHER'})
    if request.method=='POST':
        if role!='TEACHER': raise PermissionDenied('Only assigned teachers may record attendance.')
        body=request.data
        if not isinstance(body,dict) or set(body)-{'date','entries'}: raise ValidationError('Invalid attendance batch.')
        rows=body.get('entries')
        if not isinstance(rows,list) or not 1<=len(rows)<=500: raise ValidationError('Provide 1–500 attendance entries.')
        seen=set()
        for row in rows:
            if not isinstance(row,dict) or set(row)!={'record','status'} or type(row['record']) is not int: raise ValidationError('Invalid attendance entry.')
            if row['record'] in seen: raise ValidationError('Duplicate student in batch.')
            seen.add(row['record'])
            if row['status'] not in AttendanceEntry.Status.values: raise ValidationError('Select a supported attendance status.')
            record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=row['record'])
            if Sf9ReportCard.objects.filter(record=record,issued_on__isnull=False).exists(): raise PermissionDenied('Issued academic records are locked.')
            day=school_date(body.get('date'),record.school_year)
            AttendanceEntry.objects.update_or_create(record=record,date=day,defaults={'status':row['status'],'updated_by':request.user})
            record.version+=1; record.save(update_fields=['version','updated_at'])
            audit(request,'SF2','Saved daily attendance',record.pk,day.isoformat())
    qs=allowed_records(request.user,role).prefetch_related('attendance_entries')
    for param,field in [('section','section_id'),('year','school_year_id')]:
        value=request.query_params.get(param)
        if value:
            if not value.isdigit(): raise ValidationError('Invalid class filter.')
            qs=qs.filter(**{field:int(value)})
    return Response({'statuses':[{'value':v,'label':l} for v,l in AttendanceEntry.Status.choices],
        'records':[{**brief(r),'attendance':summary(r),'history':[{'date':e.date.isoformat(),'status':e.status} for e in r.attendance_entries.all()]} for r in qs[:500]],'limit':500})
