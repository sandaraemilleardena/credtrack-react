from datetime import timedelta
import secrets
from django.conf import settings
from django.contrib.auth.hashers import make_password,check_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import UserProfile
from .security import rate_limit,lock_error


def issue_code(request,user,resend=False):
    if rate_limit('email-otp-send',str(user.pk),1,60) or rate_limit('email-otp-send-hour',str(user.pk),10,3600):
        return Response({'error':'Please wait at least one minute before requesting another code.'},status=429)
    with transaction.atomic():
        profile=UserProfile.objects.select_for_update().get(user=user)
        if (not profile.email_otp_enabled and profile.role not in {'ADMIN','PRINCIPAL','TEACHER'}) or not user.is_active or lock_error(profile):
            return Response({'error':'This account cannot sign in.'},status=403)
        if not user.email:
            return Response({'error':'This account needs a registered email address. Contact the school.'},status=400)
        code=f'{secrets.randbelow(1000000):06d}'
        nonce=secrets.token_urlsafe(32)
        profile.email_otp_state={'nonce':nonce,'hash':make_password(code),'expires':(timezone.now()+timedelta(minutes=5)).timestamp(),'attempts':0,'auth_hash':user.get_session_auth_hash(),'email':user.email,'role':profile.role}
        profile.save(update_fields=['email_otp_state'])
        request.session['email_otp_challenge']={'user':user.pk,'nonce':nonce}
    try:
        sent=send_mail('CredTrack sign-in verification code',f'Your CredTrack sign-in code is: {code}\n\nAccount: {user.username}\nRole: {profile.role}\n\nThis code expires in 5 minutes and works once. Do not share it. If you did not request this sign-in, ignore this email.',settings.DEFAULT_FROM_EMAIL,[user.email],fail_silently=False)
        if sent!=1:raise RuntimeError()
    except Exception:
        UserProfile.objects.filter(user=user,email_otp_state__nonce=nonce).update(email_otp_state={})
        request.session.pop('email_otp_challenge',None)
        return Response({'error':'The verification email could not be sent. Please try again later.'},status=503)
    address=user.email.split('@')
    return Response({'authenticated':False,'otp_required':True,'email':address[0][:2]+'***@'+address[-1],'expires_in':300})


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
def verify_email_otp(request):
    if rate_limit('email-otp-verify-ip',request.META.get('REMOTE_ADDR','unknown'),30,60):
        return Response({'error':'Too many attempts. Please wait one minute.'},status=429)
    challenge=request.session.get('email_otp_challenge',{})
    with transaction.atomic():
        profile=UserProfile.objects.select_for_update().select_related('user').filter(user_id=challenge.get('user')).first()
        state=profile.email_otp_state if profile else {}
        if not profile or (not profile.email_otp_enabled and profile.role not in {'ADMIN','PRINCIPAL','TEACHER'}) or not state or not constant_time_compare(state.get('nonce',''),challenge.get('nonce','')):
            return Response({'error':'Start again with your username and password.'},status=400)
        if state.get('expires',0)<=timezone.now().timestamp() or state.get('attempts',0)>=5:
            return Response({'error':'The code has expired or reached its attempt limit. Request a new code.'},status=400)
        user=profile.user
        if not user.is_active or lock_error(profile) or state.get('email')!=user.email or state.get('role')!=profile.role or not constant_time_compare(state.get('auth_hash',''),user.get_session_auth_hash()):
            profile.email_otp_state={};profile.save(update_fields=['email_otp_state'])
            return Response({'error':'Account details changed. Start sign-in again.'},status=403)
        code=request.data.get('code','')
        state['attempts']=state.get('attempts',0)+1
        profile.email_otp_state=state;profile.save(update_fields=['email_otp_state'])
        if not isinstance(code,str) or len(code)!=6 or not code.isdigit() or not check_password(code,state['hash']):
            return Response({'error':'Incorrect verification code.'},status=400)
        from .views import finish_login
        response=finish_login(request,user,profile.role)
        if response.status_code==200:
            request.session['email_otp_verified']=True
            profile.email_otp_state={};profile.save(update_fields=['email_otp_state'])
            request.session.pop('email_otp_challenge',None)
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
def resend_email_otp(request):
    challenge=request.session.get('email_otp_challenge',{})
    profile=UserProfile.objects.select_related('user').filter(user_id=challenge.get('user')).first()
    state=profile.email_otp_state if profile else {}
    if not state or not constant_time_compare(state.get('nonce',''),challenge.get('nonce','')) or not constant_time_compare(state.get('auth_hash',''),profile.user.get_session_auth_hash()):
        return Response({'error':'Start again with your username and password.'},status=400)
    return issue_code(request,profile.user,resend=True)
