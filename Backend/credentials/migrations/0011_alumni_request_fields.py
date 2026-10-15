from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('credentials','0010_credentialrequest_csm_responses')]
    operations=[migrations.AlterField(model_name='credentialrequest',name='lrn',field=models.CharField(max_length=12,blank=True)),migrations.AlterField(model_name='credentialrequest',name='graduation_year',field=models.CharField(max_length=9,blank=True))]
