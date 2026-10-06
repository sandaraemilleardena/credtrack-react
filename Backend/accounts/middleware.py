from django.conf import settings
from django.utils.cache import add_never_cache_headers
from django.contrib.auth import logout
from django.utils import timezone


class PrivateResponseMiddleware:
    """Do not store API responses, including auth failures and CSRF rejections."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            add_never_cache_headers(response)
        return response


class IdleSessionMiddleware:
    """Background API reads never extend an authenticated session."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and getattr(getattr(request.user, "userprofile", None), "role", None) == "ICT":
            logout(request)
        if request.user.is_authenticated:
            now = timezone.now().timestamp()
            last = request.session.get("last_user_activity")
            if last is not None and now - last >= settings.SESSION_IDLE_TIMEOUT:
                logout(request)
            elif last is None or not request.path.startswith("/api/"):
                request.session["last_user_activity"] = now
                request.session.set_expiry(settings.SESSION_IDLE_TIMEOUT)
        return self.get_response(request)


class SecurityHeadersMiddleware:
    """Cover WhiteNoise, redirects, and error responses as well as views."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Local Vite development uses a separate origin and hot reload.
        if not settings.DEBUG:
            response.setdefault("Content-Security-Policy", settings.CREDTRACK_CONTENT_SECURITY_POLICY)
        response.setdefault("Permissions-Policy", settings.CREDTRACK_PERMISSIONS_POLICY)
        response.setdefault("X-Frame-Options", settings.X_FRAME_OPTIONS)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("Referrer-Policy", settings.SECURE_REFERRER_POLICY)
        return response
