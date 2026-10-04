from django.db import migrations

def update_sections(apps, schema_editor):
    Preference = apps.get_model("operations", "Preference")
    Preference.objects.update_or_create(key="grade_sections", defaults={"data": {f"Grade {n}": ["LOVE", "PEACE", "KINDNESS", "SPJ", "FAITH"] for n in range(1, 11)}})

class Migration(migrations.Migration):
    dependencies = [("credentials", "0006_school_sections")]
    operations = [migrations.RunPython(update_sections, migrations.RunPython.noop)]
