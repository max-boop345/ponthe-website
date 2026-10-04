from unittest import mock

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from galerie.auth import CASBackend


def cas_answers(username, **attributes):
    """Make the CAS validate any ticket as `username`, with these attributes."""
    client = mock.Mock()
    client.verify_ticket.return_value = (username, attributes or None, None)
    return mock.patch("galerie.auth.get_cas_client", return_value=client)


def cas_login():
    return CASBackend().authenticate(None, ticket="ST-1", service="https://x/")


class CASBackendTest(TestCase):
    def test_known_username(self):
        account = User.objects.create_user("j.dupont", first_name="Jeanne")
        with cas_answers(
            "j.dupont", mail="j.dupont@enpc.fr", givenName="J", sn="Dupont"
        ):
            user = cas_login()

        self.assertEqual(user, account)
        user.refresh_from_db()
        # Blanks are filled, what was already there is kept.
        self.assertEqual(
            (user.first_name, user.last_name, user.email),
            ("Jeanne", "Dupont", "j.dupont@enpc.fr"),
        )

    def test_unknown_username_is_matched_on_the_address(self):
        admin = User.objects.create_user(
            "admin-ponthe", email="Jeanne.Dupont@enpc.fr", is_staff=True
        )
        with cas_answers("j.dupont", mail="jeanne.dupont@enpc.fr"):
            user = cas_login()

        self.assertEqual(user, admin)
        self.assertTrue(user.is_staff)
        self.assertEqual(User.objects.count(), 1)

    def test_an_address_shared_by_two_accounts_matches_none(self):
        User.objects.create_user("one", email="shared@enpc.fr")
        User.objects.create_user("two", email="shared@enpc.fr")
        with cas_answers("j.dupont", mail="shared@enpc.fr"), self.assertLogs(
            "galerie.auth", level="WARNING"
        ):
            user = cas_login()

        self.assertEqual(user.username, "j.dupont")
        self.assertEqual(User.objects.count(), 3)

    def test_unknown_person_gets_an_account(self):
        with cas_answers(
            "j.dupont", mail=["j.dupont@enpc.fr", "other@enpc.fr"], sn="Dupont"
        ):
            user = cas_login()

        self.assertEqual(
            (user.username, user.email, user.last_name, user.is_staff),
            ("j.dupont", "j.dupont@enpc.fr", "Dupont", False),
        )

    def test_a_bare_identifier_is_not_an_address(self):
        User.objects.create_user("other", email="j.dupont")
        with cas_answers("j.dupont", mail="j.dupont"):
            user = cas_login()

        self.assertEqual((user.username, user.email), ("j.dupont", ""))

    def test_no_attributes_at_all(self):
        with cas_answers("j.dupont"):
            self.assertEqual(cas_login().username, "j.dupont")

    def test_rejected_ticket(self):
        with cas_answers(None):
            self.assertIsNone(cas_login())
        self.assertEqual(User.objects.count(), 0)

    def test_inactive_account(self):
        User.objects.create_user("j.dupont", is_active=False)
        with cas_answers("j.dupont"):
            self.assertIsNone(cas_login())

    @override_settings(CAS_CREATE_USER=False)
    def test_account_creation_can_be_switched_off(self):
        with cas_answers("j.dupont"):
            self.assertIsNone(cas_login())
        self.assertEqual(User.objects.count(), 0)


class CASLoginViewTest(TestCase):
    @override_settings(
        CAS_SERVER_URL="https://idp.example/cas/", CAS_FORCE_SSL_SERVICE_URL=True
    )
    def test_redirects_to_the_configured_cas_with_an_https_service(self):
        response = self.client.get(reverse("cas_ng_login"))

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            response["Location"].startswith(
                "https://idp.example/cas/login?service=https%3A%2F%2Ftestserver%2Faccounts%2Flogin%2F"
            ),
            response["Location"],
        )

    def test_a_valid_ticket_opens_a_session(self):
        admin = User.objects.create_user("admin-ponthe", email="j.dupont@enpc.fr")
        with cas_answers("j.dupont", mail="j.dupont@enpc.fr"):
            response = self.client.get(reverse("cas_ng_login"), {"ticket": "ST-1"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.client.session["_auth_user_id"], str(admin.pk))


class EmailBackendTest(TestCase):
    def test_two_accounts_with_the_same_address(self):
        User.objects.create_user("one", email="shared@enpc.fr", password="first")
        two = User.objects.create_user("two", email="shared@enpc.fr", password="second")

        self.assertEqual(
            authenticate(username="Shared@enpc.fr", password="second"), two
        )
        self.assertIsNone(authenticate(username="shared@enpc.fr", password="wrong"))
