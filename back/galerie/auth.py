import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django_cas_ng.backends import CASBackend as BaseCASBackend
from django_cas_ng.utils import get_cas_client

logger = logging.getLogger(__name__)


# Requires user to login with email instead of username
class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or password is None:
            return None
        UserModel = get_user_model()
        # Several accounts can carry the same address (one imported, one created
        # by the SSO): try each instead of failing on the first duplicate.
        for user in UserModel.objects.filter(email__iexact=username):
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None


# What the school's CAS sends, and where it goes on the account.
CAS_ATTRIBUTES = {"email": "mail", "first_name": "givenName", "last_name": "sn"}


def cas_attribute(attributes, name):
    """A CAS attribute as a clean string; a repeated attribute comes as a list."""
    value = attributes.get(name)
    if isinstance(value, (list, tuple)):
        value = value[0] if value else ""
    return value.strip() if isinstance(value, str) else ""


class CASBackend(BaseCASBackend):
    """
    CAS login that recognises an existing account by its e-mail address.

    django-cas-ng looks accounts up by username only, and creates a blank one
    when the username is unknown. The school's identifier cannot be derived
    from a name, so an account imported from a promotion list, or created by
    hand for an admin, does not always carry it: its owner would land on a
    second, empty account without their rights. The address the CAS sends
    settles it, as long as it designates exactly one account.
    """

    def authenticate(self, request, ticket, service):
        client = get_cas_client(service_url=service, request=request)
        username, attributes, _ = client.verify_ticket(ticket)
        if not username:
            return None
        username = self.clean_username(username)
        attributes = attributes or {}

        UserModel = get_user_model()
        user = UserModel.objects.filter(username=username).first()
        how = "username"

        email = cas_attribute(attributes, "mail")
        if user is None and "@" in email:
            matches = list(UserModel.objects.filter(email__iexact=email)[:2])
            if len(matches) == 1:
                user, how = matches[0], "e-mail address"
            elif matches:
                logger.warning(
                    "CAS: several accounts share the address of %s, none attached",
                    username,
                )

        if user is None:
            if not settings.CAS_CREATE_USER:
                return None
            user, _ = UserModel.objects.get_or_create(username=username)
            how = "new account"

        if not self.user_can_authenticate(user):
            return None

        self.fill_blanks(user, attributes)
        logger.info("CAS login: %s -> account %s (%s)", username, user.username, how)
        return user

    def fill_blanks(self, user, attributes):
        """Copy name and address from the CAS, never over a value already set."""
        changed = []
        for field, attribute in CAS_ATTRIBUTES.items():
            value = cas_attribute(attributes, attribute)
            if field == "email" and "@" not in value:
                continue
            if value and not getattr(user, field):
                max_length = user._meta.get_field(field).max_length
                setattr(user, field, value[:max_length])
                changed.append(field)
        if changed:
            user.save(update_fields=changed)
