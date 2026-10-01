"""Optional tests on a dedicated PostgreSQL test database; never use the live DB as TEST.NAME."""
from config.settings import *  # noqa: F403
import os
DATABASES["default"]["TEST"] = {"NAME": os.environ.get("CREDTRACK_TEST_DATABASE", "test_credtrack")}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
SMS_ENABLED = False
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
