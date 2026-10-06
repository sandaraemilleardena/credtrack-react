"""Database-backed authentication policy shared by API and Django admin."""
import hashlib
import math
from datetime import timedelta
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from .models import UserProfile, SecurityRateLimit


def audit(user, action, detail=""):
    from operations.models import AuditEvent
    profile = UserProfile.objects.filter(user=user).first() if user else None
    AuditEvent.objects.create(actor=user, role=profile.role if profile else "", module="Authentication",
                              action=action, object_id=str(user.pk) if user else "", detail=detail)


@transaction.atomic
def rate_limit(scope, identity, limit, seconds):
    # Fixed windows stored in PostgreSQL, shared across workers; never store secrets.
    key = hashlib.sha256(f"{scope}:{identity}".encode()).hexdigest()
    now = timezone.now()
    SecurityRateLimit.objects.get_or_create(key=key, defaults={"expires_at": now + timedelta(seconds=seconds)})
    row = SecurityRateLimit.objects.select_for_update().get(key=key)
    if row.expires_at <= now:
        row.count, row.expires_at = 0, now + timedelta(seconds=seconds)
    row.count += 1
    row.save()
    return row.count > limit


def lock_error(profile):
    if profile.account_locked:
        return {"error": "Your account has been locked due to multiple failed login attempts. Please contact the Principal for assistance.", "account_locked": True}
    if profile.temporary_locked_until and profile.temporary_locked_until > timezone.now():
        seconds = max(1, math.ceil((profile.temporary_locked_until-timezone.now()).total_seconds()))
        wait = "1 minute" if seconds == 60 else f"{seconds} seconds"
        return {"error": f"Too many failed login attempts. Please wait {wait} before trying again.", "retry_after": seconds}
    return None


class CredTrackBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not isinstance(username, str) or not isinstance(password, str) or len(username)>150 or len(password)>256:
            return None
        ip = request.META.get("REMOTE_ADDR", "unknown") if request else "unknown"
        if rate_limit("login-ip", ip, 60, 60):
            if request is not None: request.login_failure = {"error": "Too many login attempts. Please wait 1 minute before trying again.", "retry_after": 60}
            return None
        with transaction.atomic():
            user = User.objects.select_for_update().filter(username=username).first()
            if user is None:
                User().set_password(password)  # Match password hashing cost for unknown names.
                audit(None, "Failed login attempt")
                return None
            # Existing users without a role still receive the lockout policy.
            UserProfile.objects.get_or_create(user=user, defaults={"role": ""})
            profile = UserProfile.objects.select_for_update().get(user=user)
            failure = lock_error(profile)
            if failure:
                if request is not None: request.login_failure = failure
                return None
            if not user.check_password(password) or not self.user_can_authenticate(user):
                profile.failed_login_attempts += 1
                audit(user, "Failed login attempt")
                if profile.failed_login_attempts >= 6:
                    profile.account_locked, profile.locked_at = True, timezone.now()
                    audit(user, "Permanent account lock")
                elif profile.failed_login_attempts == 3:
                    profile.temporary_locked_until = timezone.now() + timedelta(minutes=1)
                    audit(user, "Temporary account lock")
                profile.save()
                if request is not None: request.login_failure = lock_error(profile)
                return None
            profile.failed_login_attempts = 0
            profile.temporary_locked_until = None
            profile.save(update_fields=["failed_login_attempts", "temporary_locked_until"])
            return user

    def get_user(self, user_id):
        user = super().get_user(user_id)
        if user:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and lock_error(profile): return None
        return user
