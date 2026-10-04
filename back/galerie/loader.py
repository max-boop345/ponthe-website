import logging
import os
import zipfile

from api.models import File, Gallery
from celery import shared_task
from django.conf import settings
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}


def gallery_path(slug, *parts):
    return os.path.join(settings.MEDIA_ROOT, slug, *parts)


def split_name(filename):
    """("IMG_1.final", "jpg") for "IMG_1.final.JPG": only the last dot counts."""
    name, extension = os.path.splitext(filename)
    return name, extension[1:]


def image_files(folder):
    """
    Names of the pictures sitting directly in `folder`, in name order.

    A zip brings more than pictures: sub-folders, `__MACOSX`, `.DS_Store`,
    files without an extension. They are skipped rather than left to break
    the whole import.
    """
    names = []
    for filename in sorted(os.listdir(folder)):
        if filename.startswith("."):
            continue
        if split_name(filename)[1].lower() not in IMAGE_EXTENSIONS:
            continue
        if not os.path.isfile(os.path.join(folder, filename)):
            continue
        names.append(filename)
    return names


def load_zip_into_gallery(zip_path, gal):
    unzip(zip_path, gal.slug)
    generate_thumbnails.delay(gal.slug)
    load_folder_into_gallery.delay(gal.slug)


def unzip(zip_path, slug):
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(path=gallery_path(slug, "uploads"), pwd=None)


@shared_task
def load_folder_into_gallery(slug):
    gal = Gallery.objects.filter(slug=slug).first()
    if gal is None:
        # Deleted between the upload and the moment the worker got to it.
        logger.warning("Gallery %s no longer exists, nothing to load", slug)
        return
    for filename in image_files(gallery_path(slug, "uploads")):
        name, extension = split_name(filename)
        # get_or_create leans on the unique constraint: two tasks loading the
        # same gallery at once cannot both insert the picture.
        File.objects.get_or_create(
            gallery=gal,
            file_full_name=filename,
            defaults={
                "file_name": name,
                "file_extension": extension,
                "link": "/media/" + slug,
            },
        )


@shared_task
def generate_thumbnails(slug):
    os.makedirs(gallery_path(slug, "thumbnails"), exist_ok=True)
    for filename in image_files(gallery_path(slug, "uploads")):
        try:
            with Image.open(gallery_path(slug, "uploads", filename)) as im:
                im = ImageOps.exif_transpose(im)
                if im.size[0] > im.size[1]:
                    im.thumbnail((510 * im.size[0] / im.size[1], 200))
                else:
                    im.thumbnail((600, 600 * im.size[1] / im.size[0]))
                im.save(gallery_path(slug, "thumbnails", filename))
        except Exception:
            # One unreadable picture must not cost the gallery all the others.
            logger.exception("No thumbnail for %s/%s", slug, filename)
