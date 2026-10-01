from django.urls import path
from . import views

urlpatterns = [path("students/<int:student_id>/credentials/<int:credential_id>/preview/", views.student_credential_preview), path("students/preview/", views.student_import_preview), path("snapshot/", views.snapshot), path("students/", views.student_action),
               path("settings/", views.settings_action), path("work/", views.work_action),
               path("accounts/", views.account_action)]
