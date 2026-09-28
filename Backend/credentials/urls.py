from django.urls import path
from . import views

urlpatterns = [
    path("submit/", views.submit, name="credential-submit"),
    path("", views.queue, name="credential-queue"),
    path("<uuid:request_id>/action/", views.action, name="credential-action"),
]
