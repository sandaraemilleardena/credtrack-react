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


    login(request, user)


    try:

        profile = UserProfile.objects.get(
            user=user
        )

        role = profile.role

    except UserProfile.DoesNotExist:

        logout(request)

        return Response(
            {
                "error": "User role is not configured."
            },
            status=status.HTTP_403_FORBIDDEN
        )


    return Response({

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

    logout(request)

    return Response({

        "message": "Logged out successfully."

    }) 

@api_view(["GET"])
def current_user(request):

    user = request.user

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
