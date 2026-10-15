from django.db import migrations,models
class Migration(migrations.Migration):
    dependencies=[('accounts','0004_alter_userprofile_role')]
    operations=[migrations.AddField(model_name='userprofile',name='profile_photo',field=models.TextField(blank=True,default=''))]
