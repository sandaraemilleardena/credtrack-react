from operations.models import Preference

PURPOSES = ["Employment", "College admission", "Scholarship", "Transfer", "Personal record", "Other Documents"]
CREDENTIALS = ["SF9 Report Card", "SF10 Permanent Record", "Good Moral Certificate", "Certificate of Enrollment", "Certificate of Appearance", "Diploma", "Transcript of Records", "Other School Document", "SF10", "SF9", "Good Moral", "Certificate of Completion"]
# School-provided sections shared by Grades 1 through 10.
DEFAULT_GRADE_SECTIONS = {f"Grade {n}": ["LOVE", "PEACE", "KINDNESS", "SPJ", "FAITH"] for n in range(1,11)}

def grade_sections():
    mapping = {grade: list(sections) for grade, sections in DEFAULT_GRADE_SECTIONS.items()}
    configured = Preference.objects.filter(key="grade_sections").first()
    if configured and isinstance(configured.data, dict):
        for grade, sections in configured.data.items():
            if grade in mapping and isinstance(sections, list):
                mapping[grade] = list(dict.fromkeys(s.strip() for s in sections if isinstance(s, str) and s.strip()))
    return mapping
