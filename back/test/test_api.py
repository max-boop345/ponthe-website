from api.models import Gallery, Year
from django.contrib.auth.models import User
from django.test import TestCase

PUBLIC = Gallery.Visibility.PUBLIC
SCHOOL = Gallery.Visibility.SCHOOL
PRIVATE = Gallery.Visibility.PRIVATE


def post_json(client, url, data):
    return client.post(url, data, content_type="application/json")


class GalleryAccessTest(TestCase):
    """Who may open a gallery, list its pictures and fetch its files."""

    # (visibility, user) -> allowed. `None` is a visitor who is not logged in.
    EXPECTED = {
        (PUBLIC, None): True,
        (PUBLIC, "student"): True,
        (PUBLIC, "staff"): True,
        (PUBLIC, "superuser"): True,
        (SCHOOL, None): False,
        (SCHOOL, "student"): True,
        (SCHOOL, "staff"): True,
        (SCHOOL, "superuser"): True,
        (PRIVATE, None): False,
        (PRIVATE, "student"): False,
        (PRIVATE, "staff"): True,
        (PRIVATE, "superuser"): True,
    }

    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.slugs = {}
        for index, visibility in enumerate((PUBLIC, SCHOOL, PRIVATE)):
            gallery = Gallery.objects.create(
                name=f"Gallery {index}",
                slug=f"gallery-{index}",
                description="",
                visibility=visibility,
                year=year,
            )
            cls.slugs[visibility] = gallery.slug
        cls.users = {
            "student": User.objects.create_user("student"),
            "staff": User.objects.create_user("staff", is_staff=True),
            "superuser": User.objects.create_superuser("superuser"),
        }

    def each_case(self):
        for (visibility, who), allowed in self.EXPECTED.items():
            if who:
                self.client.force_login(self.users[who])
            else:
                self.client.logout()
            with self.subTest(visibility=visibility, user=who):
                yield self.slugs[visibility], 200 if allowed else 403

    def test_gallery(self):
        for slug, status in self.each_case():
            response = post_json(self.client, "/api/gallery/", {"slug": slug})
            self.assertEqual(response.status_code, status)

    def test_picture_list(self):
        for slug, status in self.each_case():
            response = post_json(self.client, "/api/gallery/pics/", {"slug": slug})
            self.assertEqual(response.status_code, status)

    def test_files(self):
        for slug, status in self.each_case():
            response = self.client.get(f"/media/{slug}/uploads/picture.jpg")
            self.assertEqual(response.status_code, status)
            if status == 200:
                self.assertEqual(
                    response["X-Accel-Redirect"],
                    f"/protected/media/{slug}/uploads/picture.jpg",
                )

    def test_unknown_gallery(self):
        self.client.force_login(self.users["superuser"])
        for url in ("/api/gallery/", "/api/gallery/pics/"):
            self.assertEqual(post_json(self.client, url, {"slug": "nope"}).status_code, 404)
            self.assertEqual(post_json(self.client, url, {}).status_code, 404)
        self.assertEqual(self.client.get("/media/nope/uploads/a.jpg").status_code, 403)
