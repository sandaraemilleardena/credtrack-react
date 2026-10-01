from django.db import migrations
from django.utils import timezone


def backfill(apps, schema_editor):
    Request = apps.get_model("credentials", "CredentialRequest")
    Sequence = apps.get_model("credentials", "ReferenceSequence")
    for item in Request.objects.filter(reference__isnull=True).order_by("created_at", "id").iterator():
        year = timezone.localtime(item.created_at).year
        sequence, _ = Sequence.objects.get_or_create(year=year)
        sequence.value += 1
        if sequence.value > 99999: raise ValueError("Annual request reference capacity exceeded.")
        sequence.save()
        item.reference = f"CT-{year}-{sequence.value:05d}"
        # Keep legacy names and approval history intact; do not guess name parts or claim ID verification.
        item.save(update_fields=["reference"])

class Migration(migrations.Migration):
    dependencies = [("credentials", "0002_referencesequence_credentialrequest_confirmed_at_and_more")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
