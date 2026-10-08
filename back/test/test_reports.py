from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from api.models import File, Gallery, Report, Year


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
        with self.assertRaises(IntegrityError):
            Report.objects.create(
                file=self.file, reporter=self.student, category=Report.Category.OTHER
            )

    def test_default_category_and_blank_message(self):
        report = Report.objects.create(file=self.file, reporter=self.student)
        self.assertEqual(report.category, Report.Category.OTHER)
        self.assertEqual(report.message, "")
        self.assertIsNotNone(report.created_at)
