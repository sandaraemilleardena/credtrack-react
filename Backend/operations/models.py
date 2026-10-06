import uuid
from django.conf import settings
from django.db import models


class StudentRecord(models.Model):
    lrn = models.CharField(max_length=12, unique=True)
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
