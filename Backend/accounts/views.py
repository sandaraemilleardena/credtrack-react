from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.middleware.csrf import get_token
from django.conf import settings
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile


# ============================================================
# LOGIN
# POST /api/auth/login/
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def login_view(request):

    username = request.data.get("username")
    password = request.data.get("password")
    requested_role = request.data.get("role")

    # --------------------------------------------------------
    # Validate required fields
    # --------------------------------------------------------

    if not username or not password:

        return Response(
            {
                "error": "Username and password are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # Authenticate user using Django
    # --------------------------------------------------------

    user = authenticate(
        request,
        username=username,
        password=password
    )

    if user is None:

        failure = getattr(request, 'login_failure', None)
        if failure:
            return Response(failure, status=423 if failure.get('account_locked') else 429,
                            headers={'Retry-After': str(failure['retry_after'])} if failure.get('retry_after') else {})

        return Response(
            {
                "error": "Invalid username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    # --------------------------------------------------------
    # Check if account is active
    # --------------------------------------------------------

    if not user.is_active:

        return Response(
            {
                "error": "This account is disabled."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # --------------------------------------------------------
    # Get CredTrack user profile and role
    # --------------------------------------------------------

    try:

        profile = UserProfile.objects.get(
            user=user
        )

        role = profile.role

    except UserProfile.DoesNotExist:

        return Response(
            {
                "error": "User role is not configured."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # --------------------------------------------------------
    # Check requested role if React sends one
    # --------------------------------------------------------

    if role not in {"ADMIN", "PRINCIPAL", "TEACHER", "STUDENTS", "ALUMNI"}:
        return Response({"error": "This role no longer has system access."}, status=403)

    if requested_role:

        if str(role).upper() != str(requested_role).upper():

            return Response(
                {
                    "error": "This account does not have permission to access this login."
                },
                status=status.HTTP_403_FORBIDDEN
            )

    # --------------------------------------------------------
    # CREATE DJANGO SESSION
    # --------------------------------------------------------

    login(request, user)

    # --------------------------------------------------------
    # Return authenticated user information
    # --------------------------------------------------------

    return Response(
        {
            "authenticated": True,

            "message": "Login successful.",

            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
            }
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# LOGOUT
# POST /api/auth/logout/
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def logout_view(request):

    logout(request)

    return Response(
        {
            "authenticated": False,
            "message": "Logged out successfully."
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# CURRENT SESSION
# GET /api/auth/session/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def current_user(request):

    # --------------------------------------------------------
    # User is NOT logged in
    # --------------------------------------------------------

    if not request.user.is_authenticated:

        return Response(
            {
                "authenticated": False,
                "user": None
            },
            status=status.HTTP_200_OK
        )

    user = request.user
    if getattr(getattr(user, "userprofile", None), "role", None) not in {"ADMIN", "PRINCIPAL", "TEACHER", "STUDENTS", "ALUMNI"}:
        logout(request)
        return Response({"authenticated": False, "user": None}, status=200)

    # --------------------------------------------------------
    # Get CredTrack profile
    # --------------------------------------------------------

    try:

        profile = UserProfile.objects.get(
            user=user
        )

        role = profile.role

    except UserProfile.DoesNotExist:

        return Response(
            {
                "authenticated": False,
                "user": None,
                "error": "User role is not configured."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # --------------------------------------------------------
    # Return current Django session
    # --------------------------------------------------------

    return Response(
        {
            "authenticated": True,
            "idle_remaining_seconds": max(0, settings.SESSION_IDLE_TIMEOUT - (timezone.now().timestamp() - request.session.get("last_user_activity", timezone.now().timestamp()))),

            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
            }
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# CSRF COOKIE
# GET /api/auth/csrf/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_view(request):

    return Response(
        {
            "message": "CSRF cookie set.",
            "csrfToken": get_token(request)
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_activity(request):
    """Renew an authenticated session after explicit, CSRF-protected activity."""
    request.session["last_user_activity"] = timezone.now().timestamp()
    request.session.set_expiry(settings.SESSION_IDLE_TIMEOUT)
    return Response({"authenticated": True}, status=status.HTTP_200_OK)
