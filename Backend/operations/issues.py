from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from credentials.documents import validate_document
from .models import IssueReport, StaffNotification
from .views import staff, audit

PROBLEM_TYPES = ["Login Problem", "Request Processing Problem", "Credential Record Problem", "SMS Problem", "File Upload Problem", "File Viewing/Download Problem", "Notification Problem", "Dashboard/Statistics Problem", "Account/User Problem", "System Error", "Other"]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def read_notification(request, notification_id):
    staff(request, {"ADMIN", "PRINCIPAL"})
    row = get_object_or_404(StaffNotification, pk=notification_id, recipient=request.user)
    if row.read_at is None:
        StaffNotification.objects.filter(pk=row.pk, read_at__isnull=True).update(read_at=timezone.now())
    return Response({"message": "Notification read."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_issue(request):
    staff(request, {"ADMIN"})
    kind = request.data.get("problem_type")
    message = request.data.get("message", "")
    subject = request.data.get("subject", "") if kind == "Other" else kind
    if kind not in PROBLEM_TYPES or not isinstance(subject, str) or not 1 <= len(subject.strip()) <= 160:
        raise ValidationError("Choose a problem type and provide a subject for Other.")
    if not isinstance(message, str) or not 1 <= len(message.strip()) <= 10000:
        raise ValidationError("Provide a description of up to 10,000 characters.")
    files = request.FILES.getlist("evidence")
    if len(files) > 1:
        raise ValidationError("Attach one evidence file.")
    file = files[0] if files else None
    digest = validate_document(file) if file else ""
    row = IssueReport.objects.create(submitted_by=request.user, problem_type=kind, subject=subject.strip(), message=message.strip(), evidence=file or "", evidence_name=file.name[:255] if file else "", evidence_sha256=digest)
    audit(request, "Issue Reports", "Reported a system issue", row.pk, row.subject)
    return Response({"id": row.pk, "message": "Issue report saved for the developers.", "created_at": row.created_at}, status=201)
