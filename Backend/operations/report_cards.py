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
    if card and card.issued_on and card.data.get('_issued_snapshot'):
        return card.data['_issued_snapshot']
    from .monthly_attendance import summary
    from django.utils import timezone
    result['card']=dict(card.data) if card else {}
    attendance=summary(record)
    if attendance: result['card']['attendance']={**result['card'].get('attendance',{}),**attendance}
    result['attendance_source']='SF2' if attendance else 'Legacy report card'
    result['issued_on']=card.issued_on.isoformat() if card and card.issued_on else None
    result['generated_on']=timezone.localdate().isoformat()
    for subject in result['subjects']:
        subject['editable']=False;subject['term_editable']=[False]*3
    assignment=TeacherAssignment.objects.filter(teacher=user).first() if role=='TEACHER' else None
    result['card_editable']=False
    from django.db.models import Q
    adviser=TeacherAssignment.objects.filter(section=record.section,is_adviser=True).filter(Q(school_year=record.school_year)|Q(school_year__isnull=True)).select_related('teacher').first()
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
    role=staff(request,{'ADMIN','PRINCIPAL','TEACHER'})
    assignment=TeacherAssignment.objects.select_for_update().filter(teacher=request.user).first() if role=='TEACHER' else None
    record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=record_id)
    if request.method=='GET':return Response(card_json(record,request.user,role))
    raise PermissionDenied('Generated SF9 report cards are read-only. Use grade entry and Digital SF2.')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def issue_card(request,record_id):
    from django.utils import timezone
    staff(request,{'PRINCIPAL'})
    record=get_object_or_404(allowed_records(request.user,'PRINCIPAL').select_for_update(of=('self',)),pk=record_id)
    if not isinstance(request.data,dict) or set(request.data)!={'version'} or request.data['version']!=record.version:
        raise ValidationError('Reload the card before issuing it.')
    if not record.grades.exists(): raise ValidationError('Cannot issue a card without academic data.')
    card,_=Sf9ReportCard.objects.get_or_create(record=record)
    if not card.issued_on:
        card.issued_on=timezone.localdate();card.updated_by=request.user;card.save()
        record.version+=1;record.save()
        snapshot=card_json(record,request.user,'PRINCIPAL')
        card.data={**card.data,'_issued_snapshot':snapshot};card.save()
        audit(request,'SF9','Issued and locked report card',record.pk)
    return Response(card_json(record,request.user,'PRINCIPAL'))
