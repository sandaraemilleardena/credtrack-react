from django.urls import path
from . import views
from .issues import report_issue, read_notification
from .document_backup import export_documents

urlpatterns = [path("sms/balance/", views.sms_balance), path("issues/", report_issue), path("notifications/<int:notification_id>/read/", read_notification), path("backups/documents/", export_documents), path("students/<int:student_id>/credentials/<int:credential_id>/preview/", views.student_credential_preview), path("students/preview/", views.student_import_preview), path("snapshot/", views.snapshot), path("students/", views.student_action),
               path("settings/", views.settings_action), path("work/", views.work_action),
               path("accounts/", views.account_action)]
