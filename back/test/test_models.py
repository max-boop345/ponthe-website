from api.models import File, Gallery, Promo, Year
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase


class YearModelTest(TestCase):
    def test_year_saves_in_database(self):
        year = Year(name="Promododo")
        year.save()
        retrieved_year = Year.objects.get(pk=year.pk)
        self.assertEqual(retrieved_year.pk, year.pk)


class PromoModelTest(TestCase):
    def test_promo_saves_in_database(self):
        year = Year(name="Promododo")
        year.save()
        promo = Promo(name="Promododo", first_year=year)
        promo.save()
        retrieved_promo = Promo.objects.get(pk=promo.pk)
        self.assertEqual(retrieved_promo.pk, promo.pk)


class UniquenessTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.year = Year.objects.create(name="2026-2027")
        cls.gallery = Gallery.objects.create(
            name="Gala", slug="gala", description="", year=cls.year
        )

    def test_two_galleries_cannot_share_a_slug(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Gallery.objects.create(
                name="Gala bis", slug="gala", description="", year=self.year
            )

    def test_a_picture_is_registered_once_per_gallery(self):
        File.objects.create(gallery=self.gallery, file_full_name="a.jpg")
        with self.assertRaises(IntegrityError), transaction.atomic():
            File.objects.create(gallery=self.gallery, file_full_name="a.jpg")

        other = Gallery.objects.create(
            name="WEI", slug="wei", description="", year=self.year
        )
        File.objects.create(gallery=other, file_full_name="a.jpg")


class DuplicateCleanupMigrationTest(TransactionTestCase):
    """The constraints have to survive the duplicates of the production database."""

    before = [("api", "0007_gallery_view")]
    after = [("api", "0009_unique_slug_and_files")]

    def migrate(self, targets):
        executor = MigrationExecutor(connection)
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        # Leave the schema as the other tests expect it.
        MigrationExecutor(connection).migrate(
            MigrationExecutor(connection).loader.graph.leaf_nodes()
        )

    def test_duplicates_are_removed_and_the_oldest_row_kept(self):
        apps = self.migrate(self.before)
        Year = apps.get_model("api", "Year")
        Gallery = apps.get_model("api", "Gallery")
        File = apps.get_model("api", "File")
        year = Year.objects.create(name="2026-2027")
        gala = Gallery.objects.create(
            name="Gala", slug="gala", description="", year=year
        )
        wei = Gallery.objects.create(name="WEI", slug="wei", description="", year=year)
        first = File.objects.create(gallery=gala, file_full_name="a.jpg")
        File.objects.create(gallery=gala, file_full_name="a.jpg")
        File.objects.create(gallery=gala, file_full_name="a.jpg")
        File.objects.create(gallery=gala, file_full_name="b.jpg")
        File.objects.create(gallery=wei, file_full_name="a.jpg")

        apps = self.migrate(self.after)
        File = apps.get_model("api", "File")
        rows = File.objects.order_by("id").values_list(
            "gallery__slug", "file_full_name"
        )
        self.assertEqual(
            list(rows), [("gala", "a.jpg"), ("gala", "b.jpg"), ("wei", "a.jpg")]
        )
        self.assertTrue(File.objects.filter(pk=first.pk).exists())
