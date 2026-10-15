from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from credentials.documents import validate_document
from .models import IssueReport, StaffNotification
from .views import staff, audit
from django.conf import settings
from django.core.mail import EmailMessage

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
    email = EmailMessage(
        subject=f"[CredTrack Issue #{row.pk}] {row.subject}",
        body=f"Issue report #{row.pk}\nProblem type: {kind}\nSubmitted by: {request.user.get_full_name() or request.user.username} ({request.user.username})\nSubmitted at: {row.created_at.isoformat()}\n\n{row.message}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.DEVELOPER_ISSUE_EMAIL],
        reply_to=[request.user.email] if request.user.email else [],
    )
    sent = False
    try:
        if row.evidence:
            with row.evidence.open('rb') as source:
                email.attach(row.evidence_name, source.read())
        sent = email.send(fail_silently=False) == 1
    except Exception:
        # Keep the saved report; never expose mail credentials or provider errors.
        pass
    audit(request, "Issue Reports", "Issue email accepted" if sent else "Issue email failed", row.pk)
    return Response({"id": row.pk, "email_sent": sent, "message": "Issue report saved and emailed to the developer." if sent else "Issue report saved, but the developer email could not be sent. Please contact the developer directly; do not resubmit this report.", "created_at": row.created_at}, status=201)
