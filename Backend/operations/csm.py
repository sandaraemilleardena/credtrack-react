from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from credentials.models import CredentialRequest
from credentials.survey import score_responses
from .views import staff

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def csm_results(request):
    staff(request,{'ADMIN'})
    rows=[]
    total=positive=answered=0
    for item in CredentialRequest.objects.exclude(csm_responses={}).order_by('-created_at').iterator():
        survey=item.csm_responses
        config=survey.get('configuration',{})
        answers=survey.get('answers',{})
        score=score_responses(config,answers) if config.get('questions') else {'answered':0,'average':None,'satisfied_percent':None}
        # Aggregate only the supplied official scale; retain legacy responses separately.
        if survey.get('version')=='arta-mc-2022-05-online-1':
            values=[answers[q['id']] for q in config['questions'] if q['type']=='rating' and type(answers.get(q['id'])) is int]
            total+=sum(values);positive+=sum(v>=4 for v in values);answered+=len(values)
        rows.append({'id':str(item.pk),'reference':item.reference,'name':item.full_name,'requester_type':item.requester_type,'created_at':item.created_at,'survey':survey,'score':score})
    return Response({'results':rows,'summary':{'responses':len(rows),'rated_answers':answered,'average':round(total/answered,2) if answered else None,'satisfied_percent':round(100*positive/answered,2) if answered else None}},headers={'Cache-Control':'private, no-store'})
