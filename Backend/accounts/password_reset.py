from urllib.parse import urlsplit
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.html import format_html
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .security import audit, rate_limit

MESSAGE = "If the information provided matches a registered account, a password-reset link will be sent to the registered email address."

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def request_reset(request):
    username, email = request.data.get("username", ""), request.data.get("email", "")
    if not isinstance(username, str) or not isinstance(email, str) or not username.strip() or not email.strip() or len(username)>150 or len(email)>254:
        return Response({"error": "Enter your username and registered email."}, status=400)
    limited = rate_limit("reset-ip", request.META.get("REMOTE_ADDR", "unknown"), 10, 3600)
    audit(None, "Password reset request")
    if limited: return Response({"error": "Too many requests. Please try again later."}, status=429, headers={"Retry-After": "3600"})
    if rate_limit("reset-account", username.strip().casefold(), 3, 3600): return Response({"error": "Too many requests. Please try again later."}, status=429, headers={"Retry-After": "3600"})
    user = User.objects.filter(username=username.strip(), email__iexact=email.strip(), is_active=True).first()
    if user and user.has_usable_password():
        origin = settings.CREDTRACK_FRONTEND_URL.rstrip("/")
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
            audit(None, "Password reset configuration invalid")
            return Response({"message": MESSAGE})
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        link = f"{origin}/reset-password/{uid}/{token}"
        html = format_html(
            '<div style="background:#f8f4f5;padding:32px;font-family:Arial,sans-serif;color:#34252a">'
            '<div style="max-width:560px;margin:auto;background:white;border-top:5px solid #990e23;padding:32px;border-radius:12px">'
            '<h1 style="color:#990e23">CredTrack</h1><h2>Password reset</h2>'
            '<p>We received a request to reset your CredTrack password.</p>'
            '<p style="margin:28px 0"><a href="{}" style="background:#990e23;color:white;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a></p>'
            '<p>This link expires in <strong>one hour</strong> and can be used once.</p>'
            '<p>If you did not request this reset, ignore this email. Your password will remain unchanged.</p>'
            '<p>Accounts locked by the security policy still require ICT Personnel to unlock them.</p>'
            '<p>If the button does not work, open this link:</p><a href="{}">{}</a></div></div>', link, link, link)
        try:
            send_mail("CredTrack Password Reset", f"A password reset was requested for your CredTrack account.\n\nOpen this link to change your password:\n{link}\n\nThis link expires in one hour and can be used once. If you did not request this, ignore this email. Permanent account locks require ICT assistance.", settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html)
        except Exception:
            # Keep response identical and do not log the mail body/token or SMTP secrets.
            audit(None, "Password reset email delivery failed")
    return Response({"message": MESSAGE})

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
@transaction.atomic
def complete_reset(request):
    if rate_limit("reset-complete-ip", request.META.get("REMOTE_ADDR", "unknown"), 30, 60):
        return Response({"error": "Too many attempts. Please wait 1 minute."}, status=429)
    uid, token = request.data.get("uid", ""), request.data.get("token", "")
    if not isinstance(uid, str) or not isinstance(token, str) or len(uid)>64 or len(token)>200:
        return Response({"error": "This password reset link is invalid or has expired. Please request a new password reset link."}, status=400)
    try:
        pk = urlsafe_base64_decode(uid).decode()
        # Reject out-of-range IDs before passing them to PostgreSQL's bigint parameter.
        if not pk.isascii() or not pk.isdigit() or not 0 < int(pk) <= 9223372036854775807:
            raise ValueError("Invalid account identifier")
        user = User.objects.select_for_update().get(pk=int(pk), is_active=True)
    except (ValueError, TypeError, OverflowError, UnicodeError, User.DoesNotExist):
        return Response({"error": "This password reset link is invalid or has expired. Please request a new password reset link."}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({"error": "This password reset link is invalid or has expired. Please request a new password reset link."}, status=400)
    password, confirmation = request.data.get("password"), request.data.get("confirm_password")
    if not isinstance(password, str) or not password or len(password)>256:
        return Response({"error": "Enter a password of at most 256 characters."}, status=400)
    if password != confirmation: return Response({"error": "Passwords do not match."}, status=400)
    try: validate_password(password, user)
    except ValidationError as exc: return Response({"error": " ".join(exc.messages)}, status=400)
    user.set_password(password)
    user.save(update_fields=["password"])
    # Password hash change invalidates reset tokens and existing Django sessions.
    # Both temporary and permanent locks are intentionally preserved.
    audit(user, "Password reset completed")
    return Response({"message": "Password changed successfully. Please log in using your new password."})
