from django.core.exceptions import ImproperlyConfigured
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Local KEY=value settings. Deployment environment variables take precedence.
# No shell expansion or execution; keep Backend/.env outside version control.
_env_file = BASE_DIR / ".env"
if _env_file.is_file():
    for _line in _env_file.read_text(encoding="utf-8-sig").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _key, _value = _line.split("=", 1)
        _value = _value.strip()
        if len(_value) >= 2 and _value[0] == _value[-1] and _value[0] in {"'", '"'}:
            _value = _value[1:-1]
        os.environ.setdefault(_key.strip(), _value)



# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "CHANGE-THIS-IN-PRODUCTION"
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

if not DEBUG and SECRET_KEY == "CHANGE-THIS-IN-PRODUCTION":
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY before disabling DEBUG.")

ALLOWED_HOSTS = [host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]


# ============================================================
# APPLICATIONS
# ============================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",

    "accounts",
    "credentials",
    "operations",
]

# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "accounts.middleware.SecurityHeadersMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "corsheaders.middleware.CorsMiddleware",
    "accounts.middleware.PrivateResponseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "accounts.middleware.IdleSessionMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# ============================================================
# DATABASE — POSTGRESQL
# ============================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",

        "NAME": os.environ.get(
            "DB_NAME",
            "credtrack"
        ),

        "USER": os.environ.get(
            "DB_USER",
            "postgres"
        ),

        "PASSWORD": os.environ.get(
            "DB_PASSWORD",
            ""
        ),

        "HOST": os.environ.get(
            "DB_HOST",
            "127.0.0.1"
        ),

        "PORT": os.environ.get(
            "DB_PORT",
            "5201"
        ),
    }
}


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME":
        "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.MinimumLengthValidator",

        "OPTIONS": {
            "min_length": 10,
        },
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.CommonPasswordValidator",
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Manila"

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_ROOT = BASE_DIR.parent / "Frontend" / "dist"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get(
    "DJANGO_FRONTEND_ORIGINS", "http://localhost:7787,http://127.0.0.1:7787" if DEBUG else ""
).split(",") if origin.strip()]
CORS_URLS_REGEX = r"^/api/.*$"

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["X-Document-Filename"]


# ============================================================
# CSRF
# ============================================================

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()


# ============================================================
# SESSION SECURITY
# ============================================================

# JavaScript cannot directly read the Django session cookie.
SESSION_COOKIE_HTTPONLY = True

# Allows the React frontend and Django backend to work together
# during local development.
SESSION_COOKIE_SAMESITE = "Lax"

# Use HTTPS-only cookies outside local development.
SESSION_COOKIE_SECURE = not DEBUG

# Sliding expiry is renewed only by user activity, not dashboard polling.
SESSION_COOKIE_AGE = 15 * 60
SESSION_IDLE_TIMEOUT = 15 * 60

# Session ends when the browser is closed.
SESSION_EXPIRE_AT_BROWSER_CLOSE = True


# ============================================================
# CSRF COOKIE
# ============================================================

# React needs access to the CSRF cookie so it can send the
# CSRF token with protected POST requests.
CSRF_COOKIE_HTTPONLY = False

CSRF_COOKIE_SAMESITE = "Lax"

# Use HTTPS-only cookies outside local development.
CSRF_COOKIE_SECURE = not DEBUG


# ============================================================
# SECURITY HEADERS
# ============================================================

SECURE_SSL_REDIRECT = not DEBUG

# Begin with one hour; increase after verifying production HTTPS.
SECURE_HSTS_SECONDS = 0 if DEBUG else int(os.environ.get("DJANGO_HSTS_SECONDS", "3600"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_REFERRER_POLICY = "same-origin"

# Allow existing font services, React inline styles, and blob PDF previews.
# Scripts cannot use unsafe-inline or unsafe-eval.
CREDTRACK_CONTENT_SECURITY_POLICY = "; ".join([
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-src 'self' blob:",
    "upgrade-insecure-requests",
])
CREDTRACK_PERMISSIONS_POLICY = (
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
)

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# SMS / Semaphore
SMS_ENABLED = os.environ.get("SMS_ENABLED", "False").lower() == "true"
SEMAPHORE_API_KEY = os.environ.get("SEMAPHORE_API_KEY", "")
SEMAPHORE_SENDER_NAME = os.environ.get("SEMAPHORE_SENDER_NAME", "")

AUTHENTICATION_BACKENDS = ["accounts.security.CredTrackBackend"]
PASSWORD_RESET_TIMEOUT = 3600
CREDTRACK_FRONTEND_URL = os.environ.get("FRONTEND_URL", os.environ.get("CREDTRACK_FRONTEND_URL", "http://localhost:7787"))
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() == "true"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@localhost")
EMAIL_TIMEOUT = 10
PRIVATE_DOCUMENT_ROOT = Path(os.environ.get("PRIVATE_DOCUMENT_ROOT", str(BASE_DIR / "private_documents")))
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
