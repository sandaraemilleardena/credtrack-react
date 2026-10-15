"""Versioned CSM configuration; no personal answers are returned publicly."""
from rest_framework.exceptions import ValidationError
import json
from pathlib import Path
DEFAULT = {'version':'temporary-1','temporary':True,
    'notice':'Temporary CSM configuration. The official school survey has not yet been supplied.',
    'questions':[{'id':'placeholder_acknowledgment','label':'Temporary survey acknowledgment: I understand the official CSM survey is pending.',
        'type':'choice','required':True,'options':['Acknowledged']}]}


def configuration():
    from operations.models import Preference
    row=Preference.objects.filter(key='csm-survey').first()
    config=row.data if row else json.loads(Path(__file__).with_name('csm_official.json').read_text(encoding='utf-8'))
    if not isinstance(config,dict) or not isinstance(config.get('version'),str) or not isinstance(config.get('questions'),list) or not config['questions']:
        raise ValidationError('CSM survey configuration is unavailable. Contact the school.')
    seen=set()
    for q in config['questions']:
        if not isinstance(q,dict) or not isinstance(q.get('id'),str) or q['id'] in seen or not isinstance(q.get('label'),str) or q.get('type') not in ['rating','choice','text'] or type(q.get('required')) is not bool:
            raise ValidationError('CSM survey configuration is invalid. Contact the school.')
        seen.add(q['id'])
        if q['type']=='choice' and (not isinstance(q.get('options'),list) or not q['options'] or any(not isinstance(x,str) for x in q['options'])): raise ValidationError('Invalid CSM choices.')
        if q['type']=='rating' and (type(q.get('min')) is not int or type(q.get('max')) is not int or not 0<=q['min']<q['max']<=10): raise ValidationError('Invalid CSM rating scale.')
    return config


def validate_responses(value):
    config=configuration()
    if not isinstance(value,dict) or set(value)!={'version','answers'} or value['version']!=config['version'] or not isinstance(value['answers'],dict):
        raise ValidationError('Complete the current CSM survey before submitting.')
    answers=value['answers'];errors={}
    if set(answers)-{q['id'] for q in config['questions']}: raise ValidationError('Unknown CSM question.')
    for q in config['questions']:
        answer=answers.get(q['id'])
        if answer is None or answer=='':
            if q['required']:errors[q['id']]='This survey question is required.'
            continue
        valid=(q['type']=='text' and isinstance(answer,str) and len(answer)<=2000 and bool(answer.strip())) or (q['type']=='choice' and answer in q['options']) or (q['type']=='rating' and type(answer) is int and q['min']<=answer<=q['max'])
        if not valid:errors[q['id']]='Enter a valid survey response.'
    if errors:raise ValidationError(errors)
    # Save the question snapshot alongside answers so later configuration changes preserve meaning.
    if config['version']=='arta-mc-2022-05-online-1':
        if str(answers.get('CC1','')).startswith('3.'):
            answers={k:v for k,v in answers.items() if k not in ['CC2','CC3','cc3_reason']}
        elif str(answers.get('CC2','')).startswith('3.'):
            answers={k:v for k,v in answers.items() if k not in ['CC3','cc3_reason']}
    return {**value,'answers':answers,'configuration':config,'score':score_responses(config,answers)}


def score_responses(config, answers):
    ratings=[answers[q['id']] for q in config['questions'] if q['type']=='rating' and type(answers.get(q['id'])) is int]
    return {'answered':len(ratings),'average':round(sum(ratings)/len(ratings),2) if ratings else None,
            'satisfied_percent':round(sum(v>=4 for v in ratings)*100/len(ratings),2) if ratings else None}
