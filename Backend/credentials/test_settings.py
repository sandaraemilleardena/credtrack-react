"""Isolated tests: no PostgreSQL writes and no real SMS."""
from config.settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
SMS_ENABLED = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
