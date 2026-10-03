from django.urls import path

from .views import (
    login_view,
    logout_view,
    current_user,
    csrf_view,
)


from .password_reset import request_reset, complete_reset
from .views import user_activity

urlpatterns = [
    path("activity/", user_activity),
    path("forgot-password/", request_reset),
    path("reset-password/", complete_reset),

    # --------------------------------------------------------
    # LOGIN
    # POST /api/auth/login/
    # --------------------------------------------------------

    path(
        "login/",
        login_view,
        name="login"
    ),

    # --------------------------------------------------------
    # LOGOUT
    # POST /api/auth/logout/
    # --------------------------------------------------------

    path(
        "logout/",
        logout_view,
        name="logout"
    ),

    # --------------------------------------------------------
    # CURRENT SESSION
    # GET /api/auth/session/
    # --------------------------------------------------------

    path(
        "session/",
        current_user,
        name="session"
    ),

    # --------------------------------------------------------
    # CSRF
    # GET /api/auth/csrf/
    # --------------------------------------------------------

    path(
        "csrf/",
        csrf_view,
        name="csrf"
    ),

]
