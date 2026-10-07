"""Yearly, three-term teacher comments with server-side class authorization."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from .models import TeacherAssignment,TeacherComment,GradingTerm
from .sf9 import allowed_records,brief,alphabetical_records
from .views import staff,audit

@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def comments(request):
    role=staff(request,{'TEACHER','ADMIN','PRINCIPAL'})
    if request.method=='POST':
        if role!='TEACHER': raise PermissionDenied('Only the assigned teacher can enter comments.')
        body=request.data
        if not isinstance(body,dict) or set(body)-{'record','term','message'}: raise ValidationError('Invalid comment details.')
        if type(body.get('record')) is not int or type(body.get('term')) is not int or body['term'] not in [1,2,3]: raise ValidationError('Choose a student and Term 1, 2 or 3.')
        message=body.get('message')
        if not isinstance(message,str) or len(message)>2000: raise ValidationError('Enter a comment of at most 2,000 characters.')
        assignment=get_object_or_404(TeacherAssignment.objects.select_for_update(),teacher=request.user)
        record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=body['record'])
        term=GradingTerm.objects.get(number=body['term'])
        TeacherComment.objects.update_or_create(record=record,teacher=request.user,term=term,defaults={'message':message.strip(),'subject':assignment.subject})
        audit(request,'Teacher Comments','Updated term comment',record.student_id,f'Term {term.number} / {record.school_year.name}')
    records=allowed_records(request.user,role)
    year=request.query_params.get('year')
    if year:
        if not year.isdigit(): raise ValidationError('Invalid school year.')
        records=records.filter(school_year_id=year)
    records=list(alphabetical_records(records)[:500])
    entries=TeacherComment.objects.filter(record_id__in=[r.pk for r in records]).select_related('teacher','subject','term')
    return Response({'records':[{**brief(r),'comments':[{'teacher_id':c.teacher_id,'teacher':c.teacher.get_full_name() or c.teacher.username,'subject':c.subject.name,'term':c.term.number,'message':c.message,'updated_at':c.updated_at.isoformat(),'editable':role=='TEACHER' and c.teacher_id==request.user.pk} for c in entries if c.record_id==r.pk]} for r in records]})
