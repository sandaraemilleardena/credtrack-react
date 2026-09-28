from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):

    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:

        return Response(
            {
                "error": "Username and password are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )


    user = authenticate(
        request,
        username=username,
        password=password
    )


    if user is None:

        return Response(
            {
                "error": "Invalid username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


    if not user.is_active:

        return Response(
            {
                "error": "This account is disabled."
            },
            status=status.HTTP_403_FORBIDDEN
        )





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


    requested_role = request.data.get("role")
    if requested_role is not None and requested_role != role:
        return Response(
            {"error": "This account is not authorized for the selected role."},
            status=status.HTTP_403_FORBIDDEN,
        )

    login(request, user)
    from operations.models import AuditEvent
    AuditEvent.objects.create(actor=user, role=role, module="Authentication", action="Signed in")

    return Response({

        "authenticated": True,

        "message": "Login successful.",

        "user": {

            "id": user.id,

            "username": user.username,

            "first_name": user.first_name,

            "last_name": user.last_name,

            "role": role,

        }

    })

@api_view(["POST"])
def logout_view(request):

    from operations.models import AuditEvent
    from credentials.services import user_role
    if request.user.is_authenticated:
        AuditEvent.objects.create(actor=request.user, role=user_role(request.user) or "", module="Authentication", action="Signed out")
    logout(request)

    return Response({

        "message": "Logged out successfully."

    }) 

@api_view(["GET"])
@permission_classes([AllowAny])
def current_user(request):

    user = request.user

    if not user.is_authenticated:
        return Response({"authenticated": False, "user": None})

    profile = UserProfile.objects.get(
        user=user
    )

    return Response({

        "authenticated": True,

        "user": {

            "id": user.id,

            "username": user.username,

            "first_name": user.first_name,

            "last_name": user.last_name,

            "role": profile.role,

        }

    }) 
from django.views.decorators.csrf import ensure_csrf_cookie


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_view(request):

    return Response({
        "message": "CSRF cookie set."
    })
