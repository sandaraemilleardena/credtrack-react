import re
import secrets
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from accounts.security import rate_limit
from .models import Preference
from .views import staff, audit


def matches(pin, data):
    if not isinstance(pin, str) or not re.fullmatch(r"[0-9]{4}", pin):
        return False
    hashed = data.get("hash")
    return check_password(pin, hashed) if hashed else secrets.compare_digest(pin, "1905")


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_pin(request):
    if rate_limit("school-pin", request.META.get("REMOTE_ADDR", "unknown"), 10, 60):
        return Response({"detail": "Too many PIN attempts. Please wait one minute."}, status=429)
    row = Preference.objects.filter(key="school-entry-pin").first()
    if not matches(request.data.get("pin"), row.data if row else {}):
        raise ValidationError("Incorrect PIN. Enter the four-digit school PIN.")
    return Response({"verified": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_pin(request):
    staff(request, {"PRINCIPAL"})
    if rate_limit("school-pin-change", str(request.user.pk), 10, 60):
        return Response({"detail": "Too many PIN attempts. Please wait one minute."}, status=429)
    new_pin = request.data.get("new_pin")
    if not isinstance(new_pin, str) or not re.fullmatch(r"[0-9]{4}", new_pin):
        raise ValidationError("The new PIN must contain exactly four digits.")
    if new_pin != request.data.get("confirm_pin"):
        raise ValidationError("The new PIN and confirmation do not match.")
    with transaction.atomic():
        Preference.objects.get_or_create(key="school-entry-pin")
        row = Preference.objects.select_for_update().get(key="school-entry-pin")
        if not matches(request.data.get("current_pin"), row.data):
            raise ValidationError("The current school PIN is incorrect.")
        if matches(new_pin, row.data):
            raise ValidationError("Choose a PIN different from the current PIN.")
        row.data = {"hash": make_password(new_pin)}
        row.version += 1
        row.save()
        audit(request, "Authentication", "Changed school entry PIN")
    return Response({"message": "School PIN changed successfully."})
