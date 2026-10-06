from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:request_id>/sms/status/", views.refresh_sms_status),
    path("track/", views.track),
    path("<uuid:request_id>/verification/upload/", views.attach_verification),
    path("options/", views.options),
    path("<uuid:request_id>/verification/", views.verification_document),
    path("submit/", views.submit, name="credential-submit"),
    path("", views.queue, name="credential-queue"),
    path("<uuid:request_id>/action/", views.action, name="credential-action"),
]
