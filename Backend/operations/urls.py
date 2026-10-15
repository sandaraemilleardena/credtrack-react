from django.urls import path
from . import views, sf9
from .csm import csm_results
from .comments import comments
from .report_cards import report_card, issue_card
from .monthly_attendance import attendance
from .academic_settings import academic_settings
from .issues import report_issue, read_notification
from .document_backup import export_documents
from .school_pin import verify_pin, change_pin


urlpatterns = [path("csm/results/", csm_results), path("academic-settings/", academic_settings), path("sf2/", attendance), path("sf9/records/<int:record_id>/issue/", issue_card), path("school-pin/verify/", verify_pin), path("school-pin/change/", change_pin), path("sf9/records/<int:record_id>/card/",report_card), path("sf9/comments/",comments), path("sf9/catalog/",sf9.catalog), path("sf9/records/",sf9.records), path("sf9/records/<int:record_id>/",sf9.record_detail), path("sms/balance/", views.sms_balance), path("issues/", report_issue), path("notifications/<int:notification_id>/read/", read_notification), path("backups/documents/", export_documents), path("students/<int:student_id>/credentials/<int:credential_id>/preview/", views.student_credential_preview), path("students/preview/", views.student_import_preview), path("snapshot/", views.snapshot), path("students/", views.student_action),
               path("settings/", views.settings_action), path("work/", views.work_action),
               path("accounts/", views.account_action)]
