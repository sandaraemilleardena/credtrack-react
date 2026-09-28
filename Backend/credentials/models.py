import uuid

from django.conf import settings
from django.db import models


class CredentialRequest(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        PREPARING = "PREPARING", "Preparing"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable / needs information"
        PRINCIPAL_REVIEW = "PRINCIPAL_REVIEW", "Awaiting principal approval"
        RETURNED = "RETURNED", "Returned for correction"
        PRINCIPAL_APPROVED = "PRINCIPAL_APPROVED", "Principal approved"
        READY = "READY", "Ready for release"
        COLLECTED = "COLLECTED", "Collected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission_key = models.UUIDField(unique=True)
    requester_type = models.CharField(max_length=10, choices=[("Student", "Student"), ("Alumni", "Alumni")])
    full_name = models.CharField(max_length=160)
    lrn = models.CharField(max_length=12)
    grade_level = models.CharField(max_length=40, blank=True)
    section = models.CharField(max_length=80, blank=True)
    graduation_year = models.CharField(max_length=4, blank=True)
    credential = models.CharField(max_length=160)
    purpose = models.CharField(max_length=2000)
    phone = models.CharField(max_length=13)
    email = models.EmailField(blank=True)
    additional_details = models.CharField(max_length=4000, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    version = models.PositiveIntegerField(default=0)
    prepared_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="prepared_credentials")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_credentials")
    approved_at = models.DateTimeField(null=True, blank=True)
    release_confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="release_confirmed_credentials")
    ready_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class RequestEvent(models.Model):
    request = models.ForeignKey(CredentialRequest, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=40)
    from_status = models.CharField(max_length=24, blank=True)
    to_status = models.CharField(max_length=24)
    note = models.CharField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class SmsNotification(models.Model):
    # One release notification per request, including across retries/double clicks.
    request = models.OneToOneField(CredentialRequest, on_delete=models.CASCADE, related_name="sms")
    phone = models.CharField(max_length=13)
    message = models.CharField(max_length=480)
    status = models.CharField(max_length=24, default="QUEUED")
    provider_id = models.CharField(max_length=80, blank=True)
    provider_status = models.CharField(max_length=40, blank=True)
    last_error = models.CharField(max_length=240, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
