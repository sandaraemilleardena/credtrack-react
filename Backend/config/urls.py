from django.contrib import admin
from django.http import JsonResponse, FileResponse, Http404
from django.conf import settings
from django.urls import include, path, re_path


def home(request):

    index = settings.WHITENOISE_ROOT / "index.html"
    if index.is_file():
        response = FileResponse(index.open("rb"), content_type="text/html")
        response["Cache-Control"] = "no-cache"
        return response
    return JsonResponse({
        "system": "CredTrack",
        "message": "CredTrack Django backend is running.",
        "status": "online",
    })


def frontend(request):
    index = settings.WHITENOISE_ROOT / "index.html"
    if not index.is_file():
        raise Http404("Frontend build not found")
    response = FileResponse(index.open("rb"), content_type="text/html")
    response["Cache-Control"] = "no-cache"
    return response


urlpatterns = [

    path("", home, name="home"),

    path("admin/", admin.site.urls),

    # CredTrack Authentication API
    path("api/auth/", include("accounts.urls")),
    path("api/credentials/", include("credentials.urls")),
    path("api/operations/", include("operations.urls")),
    re_path(r"^(?!api(?:/|$)|admin(?:/|$)|static(?:/|$)|assets(?:/|$)).*$", frontend),

]