from rest_framework.permissions import BasePermission


def is_manager(user):
    """
    Whoever runs the galleries: staff or superuser.

    One rule for the management pages, the management API and the private
    galleries. They used to disagree: the pages wanted a superuser and the API
    a staff member, so each kind of account could do half of the job.
    """
    return bool(user.is_authenticated and (user.is_staff or user.is_superuser))


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user)
