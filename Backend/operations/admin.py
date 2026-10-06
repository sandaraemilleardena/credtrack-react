from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html
from .models import IssueReport


@admin.register(IssueReport)
class IssueReportAdmin(admin.ModelAdmin):
    list_display = ("subject", "problem_type", "submitted_by", "created_at")
    list_filter = ("problem_type", "created_at")
    search_fields = ("subject", "message", "submitted_by__username")
    readonly_fields = ("submitted_by", "problem_type", "subject", "message", "evidence_name", "evidence_sha256", "created_at", "download_evidence")
    exclude = ("evidence",)

    def has_add_permission(self, request):
        return False

    def get_urls(self):
        return [path("<int:pk>/evidence/", self.admin_site.admin_view(self.evidence_view), name="operations_issue_evidence")] + super().get_urls()

    def download_evidence(self, obj):
        if obj.evidence:
            return format_html('<a href="{}">Download private evidence</a>', reverse("admin:operations_issue_evidence", args=[obj.pk]))
        return "No evidence attached"

    def evidence_view(self, request, pk):
        obj = self.get_object(request, pk)
        if not obj or not self.has_view_permission(request, obj) or not obj.evidence:
            raise Http404()
        response = FileResponse(obj.evidence.open("rb"), as_attachment=True, filename=obj.evidence_name, content_type="application/octet-stream")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
