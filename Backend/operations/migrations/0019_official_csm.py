import json
from pathlib import Path
from django.db import migrations


def configure(apps, schema_editor):
    Preference=apps.get_model('operations','Preference')
    config=json.loads((Path(__file__).resolve().parents[2]/'credentials'/'csm_official.json').read_text(encoding='utf-8'))
    Preference.objects.update_or_create(key='csm-survey',defaults={'data':config})


class Migration(migrations.Migration):
    dependencies=[('operations','0018_elementary_subjects')]
    operations=[migrations.RunPython(configure,migrations.RunPython.noop)]
