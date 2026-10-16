"""Short, browser-bound OTP grace period starting at an explicit logout."""
from hashlib import sha256
from django.core import signing
from django.conf import settings
from django.utils.crypto import constant_time_compare

COOKIE='credtrack_otp_grace'
SALT='credtrack.email-otp.logout-grace.v1'
SECONDS=15*60

def identity(user):
    return sha256(f'{user.get_session_auth_hash()}:{user.email}:{user.userprofile.role}'.encode()).hexdigest()

def trusted(request,user):
    try:
        value=signing.loads(request.COOKIES.get(COOKIE,''),salt=SALT,max_age=SECONDS)
        return value.get('user')==user.pk and constant_time_compare(value.get('identity',''),identity(user))
    except (signing.BadSignature,TypeError,ValueError):
        return False

def remember_logout(response,user):
    value=signing.dumps({'user':user.pk,'identity':identity(user)},salt=SALT)
    response.set_cookie(COOKIE,value,max_age=SECONDS,httponly=True,secure=settings.SESSION_COOKIE_SECURE,samesite='Lax',path='/api/auth/')
