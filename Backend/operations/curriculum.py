"""School-provided elementary subject lists, shared by SF9 and assignments."""
import re

CURRICULUM = {
    1: ['Language', 'Reading and Literacy', 'Mathematics', 'GMRC', 'Makabansa'],
    2: ['Filipino', 'English', 'Mathematics', 'GMRC', 'Makabansa'],
    3: ['Filipino', 'English', 'Mathematics', 'Science', 'GMRC', 'Makabansa'],
    4: ['Filipino', 'English', 'Mathematics', 'Science', 'GMRC', 'Araling Panlipunan', 'EPP', 'MAPEH', 'Music and Arts', 'PE and Health'],
    5: ['Filipino', 'English', 'Mathematics', 'Science', 'GMRC', 'Araling Panlipunan', 'EPP', 'MAPEH', 'Music and Arts', 'PE and Health'],
    6: ['Filipino', 'English', 'Mathematics', 'Science', 'GMRC', 'Araling Panlipunan', 'TLE', 'MAPEH', 'Music and Arts', 'PE and Health'],
}


def subject_names(grade_name):
    match = re.fullmatch(r'(?:grade\s*)?([1-6])', grade_name.strip(), re.IGNORECASE)
    return CURRICULUM.get(int(match[1])) if match else None
