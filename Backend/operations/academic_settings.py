from datetime import date
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Preference,ClassSection,Subject,SchoolYear
from .views import staff,audit


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def academic_settings(request):
    staff(request,{'PRINCIPAL'})
    from credentials.survey import configuration
    if request.method=='POST':
        body=request.data
        if not isinstance(body,dict):raise ValidationError('Invalid configuration.')
        kind=body.get('kind')
        if kind=='survey':
            previous=configuration();config=body.get('configuration')
            if not isinstance(config,dict) or config.get('version')==previous['version']:raise ValidationError('Use a new survey version when changing questions.')
            Preference.objects.update_or_create(key='csm-survey',defaults={'data':config})
            configuration()  # Invalid configuration rolls back the entire transaction.
        elif kind=='curriculum':
            section=get_object_or_404(ClassSection,pk=body.get('section'))
            ids=body.get('subject_ids')
            if not isinstance(ids,list) or not ids or any(type(i) is not int for i in ids) or len(ids)!=len(set(ids)) or Subject.objects.filter(pk__in=ids).count()!=len(ids):raise ValidationError('Select unique existing subjects.')
            # Changing a curriculum must never hide existing grades from report cards.
            used=set(section.sf9record_set.values_list('grades__subject_id',flat=True))-{None}
            if used-set(ids):raise ValidationError('Cannot remove subjects with existing academic grades.')
            Preference.objects.update_or_create(key=f'sf9-subjects:{section.pk}',defaults={'data':{'subject_ids':ids}})
        elif kind=='school_year':
            name=body.get('name','')
            try:
                first,last=map(int,name.split('-'))
                date(first,6,1);date(last,5,31)
                if last!=first+1 or name!=f'{first:04d}-{last:04d}':raise ValueError()
            except (ValueError,TypeError,AttributeError):raise ValidationError('Use consecutive years in YYYY-YYYY format.')
            SchoolYear.objects.get_or_create(name=name)
        else:raise ValidationError('Unknown configuration type.')
        audit(request,'Academic Settings','Updated '+kind)
    return Response({'survey':configuration(),'curricula':{p.key.split(':')[1]:p.data['subject_ids'] for p in Preference.objects.filter(key__startswith='sf9-subjects:')}})
