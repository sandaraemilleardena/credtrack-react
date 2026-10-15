"""Yearly, three-term teacher comments with server-side class authorization."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from .models import TeacherAssignment,TeacherComment,GradingTerm,Sf9ReportCard,Preference,ClassSection
from .sf9 import allowed_records,brief,alphabetical_records
from .views import staff,audit

@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def comments(request):
    role=staff(request,{'TEACHER','ADMIN','PRINCIPAL'})
    if request.method=='POST' and request.data.get('action')=='complete':
        if role!='TEACHER':raise PermissionDenied('Only teachers may complete comments.')
        body=request.data
        if set(body)!={'action','section','year','term'} or any(type(body.get(k)) is not int for k in ['section','year','term']) or body['term'] not in [1,2,3]:raise ValidationError('Choose class, year and term.')
        get_object_or_404(ClassSection.objects.select_for_update(),pk=body['section'])
        roster=list(allowed_records(request.user,role).filter(section_id=body['section'],school_year_id=body['year']))
        if not roster:raise PermissionDenied('No authorized students in this class.')
        for record in roster:
            own=TeacherComment.objects.filter(record=record,term__number=body['term']).exclude(message='').exists()
            card=Sf9ReportCard.objects.filter(record=record).first()
            legacy=((card.data.get('term_comments') or {}).get(str(body['term'])) or '').strip() if card else ''
            if not own and not legacy:raise ValidationError('Every student must have a saved comment before completing this term.')
        Preference.objects.get_or_create(key=f"comments-complete:{body['section']}:{body['year']}:{body['term']}",defaults={'data':{'completed_by':request.user.pk}})
        audit(request,'Teacher Comments','Completed and locked class term',body['section'],f"Term {body['term']}")
        return Response({'message':'Term comments completed and locked.'})
    if request.method=='POST':
        if role!='TEACHER': raise PermissionDenied('Only the assigned teacher can enter comments.')
        body=request.data
        if not isinstance(body,dict) or set(body)-{'record','term','message'}: raise ValidationError('Invalid comment details.')
        if type(body.get('record')) is not int or type(body.get('term')) is not int or body['term'] not in [1,2,3]: raise ValidationError('Choose a student and Term 1, 2 or 3.')
        message=body.get('message')
        if not isinstance(message,str) or len(message)>2000: raise ValidationError('Enter a comment of at most 2,000 characters.')
        assignment=None
        record=get_object_or_404(allowed_records(request.user,role).select_for_update(of=('self',)),pk=body['record'])
        get_object_or_404(ClassSection.objects.select_for_update(),pk=record.section_id)
        if Preference.objects.filter(key=f"comments-complete:{record.section_id}:{record.school_year_id}:{body['term']}").exists():raise PermissionDenied('This term is completed. Comments cannot be edited.')
        from .sf9 import matching_assignments
        assignment=matching_assignments(request.user,record).first()
        if not assignment: raise PermissionDenied('No assignment for this class.')
        if Sf9ReportCard.objects.filter(record=record,issued_on__isnull=False).exists(): raise PermissionDenied('Issued academic records are locked.')
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
    cards={card.record_id:card for card in Sf9ReportCard.objects.filter(record_id__in=[r.pk for r in records])}
    result=[]
    for record in records:
        saved=[{'teacher_id':c.teacher_id,'teacher':c.teacher.get_full_name() or c.teacher.username,'subject':c.subject.name,'term':c.term.number,'message':c.message,'updated_at':c.updated_at.isoformat(),'editable':role=='TEACHER' and c.teacher_id==request.user.pk} for c in entries if c.record_id==record.pk]
        card=cards.get(record.pk)
        if card:
            for term in [1,2,3]:
                message=(card.data.get('term_comments') or {}).get(str(term))
                if message:
                    saved.append({'teacher_id':None,'source':'report_card','teacher':card.data.get('adviser') or 'Class adviser','subject':'Adviser comment','term':term,'message':message,'updated_at':card.updated_at.isoformat(),'editable':False})
        locked=[term for term in [1,2,3] if Preference.objects.filter(key=f'comments-complete:{record.section_id}:{record.school_year_id}:{term}').exists()]
        result.append({**brief(record),'comments':saved,'locked_terms':locked})
    return Response({'records':result})
