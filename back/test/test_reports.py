from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase

from api.models import File, Gallery, Report, Year

from .test_api import post_json


class ReportModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.gallery = Gallery.objects.create(
            name="Gallery",
            slug="gallery",
            description="",
            visibility=Gallery.Visibility.PUBLIC,
            year=year,
        )
        cls.file = File.objects.create(
            file_name="picture",
            file_extension="jpg",
            file_full_name="picture.jpg",
            link="/media/gallery",
            gallery=cls.gallery,
        )
        cls.student = User.objects.create_user("student")

    def test_one_report_per_user_per_file(self):
        Report.objects.create(
            file=self.file, reporter=self.student, category=Report.Category.OTHER
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            Report.objects.create(
                file=self.file, reporter=self.student, category=Report.Category.OTHER
            )

    def test_default_category_and_blank_message(self):
        report = Report.objects.create(file=self.file, reporter=self.student)
        self.assertEqual(report.category, Report.Category.OTHER)
        self.assertEqual(report.message, "")
        self.assertIsNotNone(report.created_at)


class ReportApiTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        year = Year.objects.create(name="2026-2027")
        cls.public_gallery = Gallery.objects.create(
            name="Public",
            slug="public",
            description="",
            visibility=Gallery.Visibility.PUBLIC,
            year=year,
        )
        cls.private_gallery = Gallery.objects.create(
            name="Private",
            slug="private",
            description="",
            visibility=Gallery.Visibility.PRIVATE,
            year=year,
        )
        for gallery in (cls.public_gallery, cls.private_gallery):
            File.objects.create(
                file_name="picture",
                file_extension="jpg",
                file_full_name="picture.jpg",
                link=f"/media/{gallery.slug}",
                gallery=gallery,
            )
        cls.student = User.objects.create_user("student")
        cls.other_student = User.objects.create_user("other_student")
        cls.manager = User.objects.create_user("manager", is_staff=True)

    def report(self, slug="public", file_full_name="picture.jpg",
               category="autre", message=""):
        return post_json(self.client, "/api/gallery/pics/report/", {
            "slug": slug,
            "file_full_name": file_full_name,
            "category": category,
            "message": message,
        })

    def test_anonymous_cannot_report(self):
        response = self.report()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Report.objects.count(), 0)

    def test_logged_in_user_reports_public_gallery(self):
        self.client.force_login(self.student)
        response = self.report(category="inapproprié", message="photo floue")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Report.objects.count(), 1)
        report = Report.objects.first()
        self.assertEqual(report.file.gallery, self.public_gallery)
        self.assertEqual(report.reporter, self.student)
        self.assertEqual(report.category, "inapproprié")
        self.assertEqual(report.message, "photo floue")

    def test_same_user_cannot_report_twice(self):
        self.client.force_login(self.student)
        self.assertEqual(self.report().status_code, 201)
        response = self.report()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Report.objects.count(), 1)

    def test_two_users_can_report_the_same_photo(self):
        self.client.force_login(self.student)
        self.assertEqual(self.report().status_code, 201)
        self.client.force_login(self.other_student)
        self.assertEqual(self.report().status_code, 201)
        self.assertEqual(Report.objects.count(), 2)

    def test_unknown_category_rejected(self):
        self.client.force_login(self.student)
        response = self.report(category="n'importe quoi")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Report.objects.count(), 0)

    def test_unknown_file_rejected(self):
        self.client.force_login(self.student)
        response = self.report(file_full_name="inconnue.jpg")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(Report.objects.count(), 0)

    def test_unknown_gallery_rejected(self):
        self.client.force_login(self.student)
        response = self.report(slug="nulle-part")
        self.assertEqual(response.status_code, 404)

    def test_student_cannot_report_in_private_gallery(self):
        self.client.force_login(self.student)
        response = self.report(slug="private")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Report.objects.count(), 0)

    def test_manager_can_report_in_private_gallery(self):
        self.client.force_login(self.manager)
        response = self.report(slug="private")
        self.assertEqual(response.status_code, 201)
