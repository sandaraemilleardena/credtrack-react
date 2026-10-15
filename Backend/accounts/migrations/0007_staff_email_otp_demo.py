from django.db import migrations


def enable_demo(apps,schema_editor):
    User=apps.get_model('auth','User')
    Profile=apps.get_model('accounts','UserProfile')
    profiles=Profile.objects.filter(role__in=['ADMIN','PRINCIPAL','TEACHER'])
    User.objects.filter(pk__in=profiles.values('user_id')).update(email='southcredtrack@gmail.com')
    profiles.update(email_otp_enabled=True,email_otp_state={})


class Migration(migrations.Migration):
    dependencies=[('accounts','0006_email_otp_trial')]
    operations=[migrations.RunPython(enable_demo,migrations.RunPython.noop)]
