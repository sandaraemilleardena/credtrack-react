import uuid
from django.conf import settings
from django.db import models


class StudentRecord(models.Model):
    lrn = models.CharField(max_length=12, unique=True, null=True, blank=True)
    data = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class WorkItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, db_index=True)
    status = models.CharField(max_length=24, default="Open")
    data = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Preference(models.Model):
    key = models.CharField(max_length=80, unique=True)
    data = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=0)


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    role = models.CharField(max_length=20)
    module = models.CharField(max_length=40)
    action = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80, blank=True)
    detail = models.CharField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class StudentCredential(models.Model):
    from credentials.documents import private_storage, document_path
    student = models.ForeignKey(StudentRecord, on_delete=models.CASCADE, related_name="credential_files")
    title = models.CharField(max_length=160)
    document = models.FileField(storage=private_storage, upload_to=document_path)
    is_sample = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class StaffNotification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_notifications")
    request = models.ForeignKey("credentials.CredentialRequest", null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class IssueReport(models.Model):
    from credentials.documents import private_storage, document_path
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    problem_type = models.CharField(max_length=80)
    subject = models.CharField(max_length=160)
    message = models.TextField(max_length=10000)
    evidence = models.FileField(storage=private_storage, upload_to=document_path, blank=True)
    evidence_name = models.CharField(max_length=255, blank=True)
    evidence_sha256 = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class GradeLevel(models.Model):
    name = models.CharField(max_length=80, unique=True)
    def __str__(self): return self.name


class ClassSection(models.Model):
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['grade_level', 'name'], name='unique_grade_section')]
    def __str__(self): return f'{self.grade_level} / {self.name}'


class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)
    position = models.PositiveSmallIntegerField(default=0)
    class Meta: ordering = ['position', 'id']
    def __str__(self): return self.name


class SchoolYear(models.Model):
    name = models.CharField(max_length=40, unique=True)
    def __str__(self): return self.name


class GradingTerm(models.Model):
    number = models.PositiveSmallIntegerField(unique=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(number__gte=1, number__lte=3), name='sf9_three_terms')]


class TeacherAssignment(models.Model):
    is_adviser = models.BooleanField(default=False)
    teacher = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teaching_assignment')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.PROTECT)
    section = models.ForeignKey(ClassSection, null=True, blank=True, on_delete=models.PROTECT)
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['section'], condition=models.Q(is_adviser=True), name='one_adviser_per_section'), models.CheckConstraint(condition=models.Q(is_adviser=False) | models.Q(section__isnull=False), name='adviser_requires_section')]


class Sf9Record(models.Model):
    student = models.ForeignKey(StudentRecord, on_delete=models.PROTECT, related_name='sf9_records')
    school_year = models.ForeignKey(SchoolYear, on_delete=models.PROTECT)
    section = models.ForeignKey(ClassSection, on_delete=models.PROTECT)
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    version = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['student','school_year'], name='unique_student_sf9_year')]


class Sf9Grade(models.Model):
    record = models.ForeignKey(Sf9Record, on_delete=models.CASCADE, related_name='grades')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    term = models.ForeignKey(GradingTerm, on_delete=models.PROTECT)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['record','subject','term'], name='unique_sf9_subject_term'), models.CheckConstraint(condition=models.Q(value__gte=0,value__lte=100),name='valid_sf9_grade')]


class Sf9FinalGrade(models.Model):
    record = models.ForeignKey(Sf9Record, on_delete=models.CASCADE, related_name='final_grades')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['record','subject'],name='unique_sf9_subject_final'), models.CheckConstraint(condition=models.Q(value__gte=0,value__lte=100),name='valid_sf9_final')]


class TeacherComment(models.Model):
    record = models.ForeignKey(Sf9Record, on_delete=models.CASCADE, related_name='teacher_comments')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    term = models.ForeignKey(GradingTerm, on_delete=models.PROTECT)
    message = models.TextField(max_length=2000)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['record','teacher','term'],name='unique_teacher_comment_term')]


class Sf9ReportCard(models.Model):
    record = models.OneToOneField(Sf9Record,on_delete=models.CASCADE,related_name='report_card')
    data = models.JSONField(default=dict)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)
