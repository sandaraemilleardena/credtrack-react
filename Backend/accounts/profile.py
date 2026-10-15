import re
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied, Throttled
from rest_framework.response import Response
from .security import rate_limit


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def edit_profile(request):
    if rate_limit('edit-profile', str(request.user.pk), 5, 60):
        raise Throttled(detail='Please wait a minute before trying again.')
    data = request.data
    if not isinstance(data, dict) or set(data)-{'name','username','email','current_password','new_password','profile_photo'}:
        raise ValidationError('Only profile details and password may be changed.')
    user = User.objects.select_for_update().get(pk=request.user.pk)
    password = data.get('current_password')
    if not isinstance(password,str) or len(password)>256 or not user.check_password(password):
        raise PermissionDenied('Your current password is incorrect.')
    name, username, email = [data.get(k,'') for k in ['name','username','email']]
    if any(not isinstance(v,str) for v in [name,username,email]):
        raise ValidationError('Enter valid profile details.')
    name,username,email = name.strip(),username.strip(),email.strip()
    if not name or len(name)>150:
        raise ValidationError('Enter your full name, up to 150 characters.')
    if len(username)>150 or not re.fullmatch(r'[\w.@+-]+',username) or User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
        raise ValidationError('Choose a valid unused username.')
    user.first_name,user.last_name,user.username,user.email=name,'',username,email
    new_password=data.get('new_password','')
    if not isinstance(new_password,str) or len(new_password)>256:
        raise ValidationError('Enter a password of at most 256 characters.')
    try:
        validate_email(email)
        if new_password: validate_password(new_password,user)
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages)
    if new_password: user.set_password(new_password)
    if 'profile_photo' in data:
        photo=data['profile_photo']
        if not isinstance(photo,str) or len(photo)>2800000:
            raise ValidationError('Choose a JPEG, PNG or WebP photo under 2 MB.')
        if photo:
            import base64
            from io import BytesIO
            from PIL import Image, ImageOps
            try:
                header,encoded=photo.split(',',1)
                if header not in ['data:image/jpeg;base64','data:image/png;base64','data:image/webp;base64']:raise ValueError()
                raw=base64.b64decode(encoded,validate=True)
                if len(raw)>2*1024*1024:raise ValueError()
                with Image.open(BytesIO(raw)) as image:
                    if image.width*image.height>16000000:raise ValueError()
                    image=ImageOps.exif_transpose(image).convert('RGB')
                    image=ImageOps.fit(image,(256,256))
                    output=BytesIO();image.save(output,format='JPEG',quality=85)
                photo='data:image/jpeg;base64,'+base64.b64encode(output.getvalue()).decode('ascii')
            except Exception:
                raise ValidationError('Choose a valid JPEG, PNG or WebP photo under 2 MB.')
        profile=user.userprofile
        profile.profile_photo=photo
        profile.save(update_fields=['profile_photo'])
    user.save(update_fields=['first_name','last_name','username','email']+(['password'] if new_password else []))
    if new_password: update_session_auth_hash(request,user)
    from operations.views import audit
    audit(request,'Profile','Updated own profile',user.pk,'Profile details saved; access permissions preserved.')
    return Response({'message':'Your profile has been updated.'})
