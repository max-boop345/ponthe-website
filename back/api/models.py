from api.permissions import is_manager
from django.conf import settings
from django.db import models
from django.utils import timezone


class Year(models.Model):
    name = models.CharField(primary_key=True, max_length=10)


class Promo(models.Model):
    name = models.CharField(primary_key=True, max_length=10)
    first_year = models.ForeignKey(Year, on_delete=models.PROTECT)


# TODO: Create a year model ?
class Gallery(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(blank=False, max_length=1000, unique=True)
    # Every lookup goes through the slug, and it names the folder on disk.
    slug = models.SlugField(max_length=1000, blank=False, default="", unique=True)
    description = models.CharField(max_length=10000)
    date = models.DateTimeField(blank=False, default=timezone.now)

    class Visibility(models.TextChoices):
        PUBLIC = "publique"
        SCHOOL = "école"
        PRIVATE = "privée"

    visibility = models.CharField(
        choices=Visibility.choices, default=Visibility.PRIVATE, max_length=10
    )

    class Type(models.TextChoices):
        PHOTO = "photo"
        VIDEO = "video"

    type = models.CharField(
        blank=False, default=Type.PHOTO, choices=Type.choices, max_length=10
    )
    year = models.ForeignKey(Year, on_delete=models.PROTECT, default=None)

    class View(models.TextChoices):
        GALLERY = "galerie"
        EXPOSITION = "exposition"

    view = models.CharField(
        blank=False, default=View.GALLERY, choices=View.choices, max_length=20
    )

    def can_user_access(self, user):
        """
        The single access rule for a gallery, its picture list and its files:
        public galleries are open to everyone, school galleries to any logged-in
        user, and everything else (private) to those who run the galleries.
        """
        if self.visibility == Gallery.Visibility.PUBLIC:
            return True
        if not user.is_authenticated:
            return False
        if self.visibility == Gallery.Visibility.SCHOOL:
            return True
        return is_manager(user)


class File(models.Model):
    id = models.AutoField(primary_key=True)
    file_name = models.CharField(blank=False, max_length=1000)
    file_extension = models.CharField(blank=False, max_length=100)
    file_full_name = models.CharField(blank=False, max_length=1100)
    link = models.CharField(max_length=10000)
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, default=None)

    class Meta:
        constraints = [
            # Two import tasks running at once used to register each picture twice.
            models.UniqueConstraint(
                fields=["gallery", "file_full_name"], name="unique_file_per_gallery"
            )
        ]


class Material(models.Model):
    name = models.CharField(max_length=1000)


class Report(models.Model):
    """Un signalement de photo par un utilisateur connecté."""
    id = models.AutoField(primary_key=True)
    file = models.ForeignKey(File, on_delete=models.CASCADE)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Category(models.TextChoices):
        INAPPROPRIATE = "inapproprié"
        OFF_TOPIC = "hors sujet"
        QUALITY = "qualité"
        OTHER = "autre"

    category = models.CharField(
        blank=False, default=Category.OTHER, choices=Category.choices, max_length=20
    )
    message = models.CharField(blank=True, default="", max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Signaler la même photo dix fois n'aide pas la modération.
            models.UniqueConstraint(
                fields=["file", "reporter"], name="one_report_per_user_per_file"
            )
        ]
