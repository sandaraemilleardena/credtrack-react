from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [('ADMIN','Admin'),('PRINCIPAL','Principal'),('TEACHER','Teacher'),('STUDENTS','Students'),('ALUMNI','Alumni')]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    temporary_locked_until = models.DateTimeField(null=True, blank=True)
    account_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    unlocked_at = models.DateTimeField(null=True, blank=True)
    unlocked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="unlocked_profiles")

    def __str__(self):

        return f"{self.user.username} - {self.role}"

class SecurityRateLimit(models.Model):
    key = models.CharField(max_length=64, unique=True)
    count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
