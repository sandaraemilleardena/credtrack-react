"""Structured printable SF9 cards; grade and class authorization are backend rules."""
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError,PermissionDenied
from rest_framework.response import Response
from .models import Sf9ReportCard,TeacherAssignment,Subject,GradingTerm,Sf9Grade,TeacherComment
from .sf9 import allowed_records,record_json,write_grades,Conflict
from .views import staff,audit
MONTHS=['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr']
TEXT_FIELDS={'school_head','adviser','admitted_grade','eligible_grade','approved','admitted_in','admission_date','parent_term_1','parent_term_2','parent_term_3'}

def card_json(record,user,role):
    result=record_json(record,user,role)
    card=Sf9ReportCard.objects.filter(record=record).select_related('updated_by').first()
    result['card']=card.data if card else {}
    assignment=TeacherAssignment.objects.filter(teacher=user).first() if role=='TEACHER' else None
    result['card_editable']=bool(assignment and assignment.is_adviser and assignment.section_id==record.section_id)
    adviser=TeacherAssignment.objects.filter(section=record.section,is_adviser=True).select_related('teacher').first()
    result['card_adviser']=(adviser.teacher.get_full_name() or adviser.teacher.username) if adviser else ''
    result['card_updated_by']=(card.updated_by.get_full_name() or card.updated_by.username) if card and card.updated_by else None
    result['card_updated_at']=card.updated_at.isoformat() if card else None
    result['teacher_comments']=[{'term':c.term.number,'teacher':c.teacher.get_full_name() or c.teacher.username,'subject':c.subject.name,'message':c.message} for c in TeacherComment.objects.filter(record=record).select_related('term','teacher','subject').order_by('term__number','teacher_id')]
    return result

@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def report_card(request,record_id):
    request.user=get_object_or_404(User.objects.select_for_update(of=('self',)).select_related('userprofile'),pk=request.user.pk,is_active=True)
    role=staff(request,{'ADMIN','TEACHER'})
    assignment=TeacherAssignment.objects.select_for_update().filter(teacher=request.user).first() if role=='TEACHER' else None
    record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=record_id)
    if request.method=='GET':return Response(card_json(record,request.user,role))
    if role!='TEACHER' or not assignment:raise PermissionDenied('Only an assigned teacher may encode grades.')
    body=request.data
    if not isinstance(body,dict) or set(body)-{'version','grades','card'}:raise ValidationError('Invalid report card fields.')
    if type(body.get('version')) is not int or body['version']!=record.version:raise Conflict('The SF9 changed. Reload saved data before saving.')
    data=body.get('card',{})
    if data and (not assignment.is_adviser or assignment.section_id!=record.section_id):raise PermissionDenied('Only the Principal-assigned class adviser may encode attendance and report details.')
    if not isinstance(data,dict) or set(data)-TEXT_FIELDS-{'attendance','term_comments'}:raise ValidationError('Invalid card information.')
    for key,value in data.items():
        if key in TEXT_FIELDS and (not isinstance(value,str) or len(value)>200):raise ValidationError('Card details must be text of at most 200 characters.')
    if data.get('admission_date'):
        from datetime import date
        try:date.fromisoformat(data['admission_date'])
        except ValueError:raise ValidationError('Enter a valid admission date.')
    attendance=data.get('attendance',{})
    if not isinstance(attendance,dict) or set(attendance)-set(MONTHS):raise ValidationError('Invalid attendance months.')
    for month,row in attendance.items():
        if not isinstance(row,dict) or set(row)-{'class_days','present'}:raise ValidationError('Invalid attendance fields.')
        for value in row.values():
            if value is not None and (type(value) is not int or not 0<=value<=31):raise ValidationError('Attendance must be a whole number from 0 to 31.')
        if row.get('class_days') is not None and row.get('present') is not None and row['present']>row['class_days']:raise ValidationError('Days present cannot exceed class days.')
    comments=data.get('term_comments',{})
    if not isinstance(comments,dict) or set(comments)-{'1','2','3'} or any(not isinstance(v,str) or len(v)>2000 for v in comments.values()):raise ValidationError('Enter valid Term 1-3 comments of at most 2,000 characters.')
    write_grades(record, body.get('grades',[]), assignment, request.user)
    card,_=Sf9ReportCard.objects.get_or_create(record=record)
    card.data={**card.data,**data};card.updated_by=request.user;card.save()
    record.version+=1;record.save();record._prefetched_objects_cache={}
    audit(request,'SF9','Saved learner performance report',record.pk,'Assigned subject grades and class report-card details updated.')
    return Response(card_json(record,request.user,role))
