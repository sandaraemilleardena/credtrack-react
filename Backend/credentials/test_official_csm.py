import json
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory,force_authenticate
from rest_framework.exceptions import ValidationError
from credentials.survey import validate_responses,score_responses
from operations.csm import csm_results

class OfficialCsmTests(SimpleTestCase):
    def setUp(self):
        self.config=json.loads(Path(__file__).with_name('csm_official.json').read_text(encoding='utf-8'))
        p=patch('credentials.survey.configuration',return_value=self.config)
        p.start();self.addCleanup(p.stop)

    def test_score_excludes_unanswered_ratings(self):
        result=validate_responses({'version':self.config['version'],'answers':{'SQD1':5,'SQD2':4,'SQD3':1}})
        self.assertEqual(result['score'],{'answered':3,'average':3.33,'satisfied_percent':66.67})
        self.assertEqual(result['configuration'],self.config)

    def test_cc_skip_rules_remove_inapplicable_answers(self):
        questions={q['id']:q for q in self.config['questions']}
        result=validate_responses({'version':self.config['version'],'answers':{'CC1':questions['CC1']['options'][2],'CC2':questions['CC2']['options'][0],'CC3':questions['CC3']['options'][0]}})
        self.assertNotIn('CC2',result['answers']);self.assertNotIn('CC3',result['answers'])

    def test_invalid_or_old_questionnaire_rejected(self):
        for value in [True,6,'5']:
            with self.assertRaises(ValidationError):validate_responses({'version':self.config['version'],'answers':{'SQD1':value}})
        with self.assertRaises(ValidationError):validate_responses({'version':'old','answers':{}})

    def test_optional_blank_questionnaire_is_not_scored_as_zero(self):
        result=validate_responses({'version':self.config['version'],'answers':{}})
        self.assertIsNone(result['score']['average'])

    @patch('operations.views.user_role',return_value='PRINCIPAL')
    def test_results_not_accessible_by_non_admin(self,role):
        request=APIRequestFactory().get('/api/operations/csm/results/')
        force_authenticate(request,user=SimpleNamespace(is_authenticated=True))
        self.assertEqual(csm_results(request).status_code,403)
