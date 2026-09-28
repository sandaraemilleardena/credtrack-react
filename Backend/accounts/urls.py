from django.urls import path

from .views import (
    login_view,
    logout_view,
    current_user,
    csrf_view,
)


urlpatterns = [

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