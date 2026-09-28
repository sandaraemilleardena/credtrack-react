from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "CHANGE-THIS-IN-PRODUCTION"
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]


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
    "django.middleware.security.SecurityMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

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
            "CredTrack2026"
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

STATIC_URL = "static/"


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:7787",
    "http://127.0.0.1:7787",
]

CORS_ALLOW_CREDENTIALS = True


# ============================================================
# CSRF
# ============================================================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:7787",
    "http://127.0.0.1:7787",
]


# ============================================================
# SESSION SECURITY
# ============================================================

# JavaScript cannot directly read the Django session cookie.
SESSION_COOKIE_HTTPONLY = True

# Allows the React frontend and Django backend to work together
# during local development.
SESSION_COOKIE_SAMESITE = "Lax"

# False for localhost development.
# Change to True when the production site uses HTTPS.
SESSION_COOKIE_SECURE = False

# Session lasts for 1 hour.
SESSION_COOKIE_AGE = 60 * 60

# Session ends when the browser is closed.
SESSION_EXPIRE_AT_BROWSER_CLOSE = True


# ============================================================
# CSRF COOKIE
# ============================================================

# React needs access to the CSRF cookie so it can send the
# CSRF token with protected POST requests.
CSRF_COOKIE_HTTPONLY = False

CSRF_COOKIE_SAMESITE = "Lax"

# False for localhost development.
CSRF_COOKIE_SECURE = False


# ============================================================
# SECURITY HEADERS
# ============================================================

SECURE_BROWSER_XSS_FILTER = True

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
SMS_ENABLED = False
SEMAPHORE_API_KEY = "" 