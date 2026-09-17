from rest_framework.permissions import BasePermission


class IsPrincipal(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        if not request.user.is_authenticated:

            return False


        try:

            return (
                request.user.userprofile.role
                == "PRINCIPAL"
            )

        except Exception:

            return False

class IsAdmin(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        if not request.user.is_authenticated:

            return False


        try:

            return (
                request.user.userprofile.role
                == "ADMIN"
            )

        except Exception:

            return False

class IsStudents(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        if not request.user.is_authenticated:

            return False


        try:

            return (
                request.user.userprofile.role
                == "STUDENTS"
            )

        except Exception:

            return False