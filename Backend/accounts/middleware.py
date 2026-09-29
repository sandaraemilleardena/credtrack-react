from django.utils.cache import add_never_cache_headers


class PrivateResponseMiddleware:
    """Do not store API responses, including auth failures and CSRF rejections."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            add_never_cache_headers(response)
        return response
