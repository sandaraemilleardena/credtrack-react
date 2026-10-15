from django.db import migrations,models


def enable_trial(apps,schema_editor):
    User=apps.get_model('auth','User')
    Profile=apps.get_model('accounts','UserProfile')
    user=User.objects.filter(username__iexact='CassionCath').first()
    if user:
        User.objects.filter(pk=user.pk).update(email='southcredtrack@gmail.com')
        Profile.objects.filter(user_id=user.pk).update(email_otp_enabled=True)


class Migration(migrations.Migration):
    dependencies=[('accounts','0005_userprofile_profile_photo')]
    operations=[migrations.AddField(model_name='userprofile',name='email_otp_enabled',field=models.BooleanField(default=False)),migrations.AddField(model_name='userprofile',name='email_otp_state',field=models.JSONField(default=dict,blank=True)),migrations.RunPython(enable_trial,migrations.RunPython.noop)]
