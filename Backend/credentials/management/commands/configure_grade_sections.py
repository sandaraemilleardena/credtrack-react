import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from operations.models import Preference

class Command(BaseCommand):
    help = "Load actual school grade-to-section assignments from a JSON object (Grades 1–10)."
    def add_arguments(self, parser): parser.add_argument("file")
    def handle(self, *args, **options):
        try: data = json.loads(Path(options["file"]).read_text(encoding="utf-8-sig"))
        except (OSError, ValueError) as exc: raise CommandError(str(exc))
        grades = {f"Grade {i}" for i in range(1,11)}
        if not isinstance(data, dict) or any(g not in grades or not isinstance(sections,list) or any(not isinstance(s,str) or not s.strip() or len(s)>80 for s in sections) for g,sections in data.items()):
            raise CommandError('Use an object mapping Grade 1 through Grade 10 to arrays of actual section names.')
        cleaned = {g: sorted(set(s.strip() for s in sections)) for g,sections in data.items()}
        Preference.objects.update_or_create(key="grade_sections",defaults={"data":cleaned})
        self.stdout.write(self.style.SUCCESS("Grade-section mapping saved. Submitted grades override the default school assignments."))
