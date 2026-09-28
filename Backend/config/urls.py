from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def home(request):

    return JsonResponse({
        "system": "CredTrack",
        "message": "CredTrack Django backend is running.",
        "status": "online",
    })


urlpatterns = [

    path("", home, name="home"),

    path("admin/", admin.site.urls),

    # CredTrack Authentication API
    path("api/auth/", include("accounts.urls")),
    path("api/credentials/", include("credentials.urls")),
    path("api/operations/", include("operations.urls")),

]