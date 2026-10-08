import io
import os
import shutil
import zipfile

from api.models import File, Gallery, Year
from django.contrib.auth.models import User
from django.test import TestCase

from galerie.loader import gallery_path

from .test_api import post_json

SLUG = "select-public"
PRIVATE_SLUG = "select-private"


class DownloadPicsTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.gallery = Gallery.objects.create(
            name="Selection",
            slug=SLUG,
            description="",
            visibility=Gallery.Visibility.PUBLIC,
            year=year,
        )
        for name in ("picture.jpg", "other.jpg", "untouched.jpg"):
            File.objects.create(
                file_name=os.path.splitext(name)[0],
                file_extension="jpg",
                file_full_name=name,
                link=f"/media/{SLUG}",
                gallery=cls.gallery,
            )
        cls.student = User.objects.create_user("student")
        cls.manager = User.objects.create_user("manager", is_staff=True)

    def setUp(self):
        # download_pics lit les fichiers sur le disque : on en pose des faux.
        os.makedirs(gallery_path(SLUG, "uploads"), exist_ok=True)
        for name in ("picture.jpg", "other.jpg", "untouched.jpg"):
            with open(gallery_path(SLUG, "uploads", name), "wb") as f:
                f.write(b"fake image bytes")

    def tearDown(self):
        shutil.rmtree(gallery_path(SLUG), ignore_errors=True)

    def download(self, slug=SLUG, names=("picture.jpg", "other.jpg"), who=None):
        if who is not None:
            self.client.force_login(who)
        return post_json(
            self.client,
            "/api/gallery/pics/download/",
            {"slug": slug, "file_full_names": list(names)},
        )

    def test_zip_contains_selected_pictures(self):
        response = self.download()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/zip")
        archive = zipfile.ZipFile(io.BytesIO(response.content))
        self.assertEqual(sorted(archive.namelist()), ["other.jpg", "picture.jpg"])

    def test_unknown_gallery_returns_404(self):
        response = self.download(slug="does-not-exist")
        self.assertEqual(response.status_code, 404)

    def test_empty_selection_returns_400(self):
        response = self.download(names=())
        self.assertEqual(response.status_code, 400)

    def test_selection_of_unknown_pictures_returns_404(self):
        response = self.download(names=("ghost.jpg",))
        self.assertEqual(response.status_code, 404)

    def test_unknown_names_are_ignored(self):
        response = self.download(names=("picture.jpg", "ghost.jpg"))
        self.assertEqual(response.status_code, 200)
        archive = zipfile.ZipFile(io.BytesIO(response.content))
        self.assertEqual(archive.namelist(), ["picture.jpg"])

    def test_missing_disk_file_is_omitted_from_zip(self):
        os.remove(gallery_path(SLUG, "uploads", "other.jpg"))
        response = self.download()
        self.assertEqual(response.status_code, 200)
        archive = zipfile.ZipFile(io.BytesIO(response.content))
        self.assertEqual(archive.namelist(), ["picture.jpg"])

    def test_names_not_a_list_returns_400(self):
        response = post_json(
            self.client,
            "/api/gallery/pics/download/",
            {"slug": SLUG, "file_full_names": "picture.jpg"},
        )
        self.assertEqual(response.status_code, 400)


class DownloadPicsAccessTest(TestCase):
    """Une galerie privée ne se télécharge que si on peut la voir."""

    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.private_gallery = Gallery.objects.create(
            name="Selection privée",
            slug=PRIVATE_SLUG,
            description="",
            visibility=Gallery.Visibility.PRIVATE,
            year=year,
        )
        File.objects.create(
            file_name="picture",
            file_extension="jpg",
            file_full_name="picture.jpg",
            link=f"/media/{PRIVATE_SLUG}",
            gallery=cls.private_gallery,
        )
        cls.student = User.objects.create_user("student")
        cls.manager = User.objects.create_user("manager", is_staff=True)

    def setUp(self):
        os.makedirs(gallery_path(PRIVATE_SLUG, "uploads"), exist_ok=True)
        with open(
            gallery_path(PRIVATE_SLUG, "uploads", "picture.jpg"), "wb"
        ) as f:
            f.write(b"fake image bytes")

    def tearDown(self):
        shutil.rmtree(gallery_path(PRIVATE_SLUG), ignore_errors=True)

    def download(self, who=None):
        if who is not None:
            self.client.force_login(who)
        return post_json(
            self.client,
            "/api/gallery/pics/download/",
            {"slug": PRIVATE_SLUG, "file_full_names": ["picture.jpg"]},
        )

    def test_anonymous_and_student_are_refused(self):
        self.assertEqual(self.download().status_code, 403)
        self.assertEqual(self.download(self.student).status_code, 403)

    def test_manager_can_download(self):
        self.assertEqual(self.download(self.manager).status_code, 200)


class DeletePicsTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.gallery = Gallery.objects.create(
            name="Selection delete",
            slug="select-delete",
            description="",
            visibility=Gallery.Visibility.PUBLIC,
            year=year,
        )
        for name in ("picture.jpg", "other.jpg", "untouched.jpg"):
            File.objects.create(
                file_name=os.path.splitext(name)[0],
                file_extension="jpg",
                file_full_name=name,
                link="/media/select-delete",
                gallery=cls.gallery,
            )
        cls.student = User.objects.create_user("student")
        cls.manager = User.objects.create_user("manager", is_staff=True)

    def delete_many(self, slug="select-delete", names=("picture.jpg", "other.jpg"), who=None):
        if who is not None:
            self.client.force_login(who)
        return post_json(
            self.client,
            "/api/gallery/pics/delete_many/",
            {"slug": slug, "file_full_names": list(names)},
        )

    def test_manager_deletes_selected_pictures(self):
        response = self.delete_many(who=self.manager)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["deleted"], 2)
        remaining = set(
            File.objects.filter(gallery=self.gallery).values_list(
                "file_full_name", flat=True
            )
        )
        self.assertEqual(remaining, {"untouched.jpg"})

    def test_student_cannot_delete_pictures(self):
        response = self.delete_many(who=self.student)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(File.objects.filter(gallery=self.gallery).count(), 3)

    def test_unknown_gallery_returns_404(self):
        response = self.delete_many(slug="does-not-exist", who=self.manager)
        self.assertEqual(response.status_code, 404)

    def test_empty_selection_returns_400(self):
        response = self.delete_many(names=(), who=self.manager)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(File.objects.filter(gallery=self.gallery).count(), 3)
