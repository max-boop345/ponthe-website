import zipfile

from api.models import Gallery
from django.contrib.auth.decorators import user_passes_test
from django.core.files.storage import FileSystemStorage
from django.http import HttpResponseBadRequest
from django.shortcuts import get_object_or_404, render
from galerie.loader import load_zip_into_gallery


@user_passes_test(lambda u: u.is_superuser)
def index_view(request):
    return render(request, "gestionindex.html")


@user_passes_test(lambda u: u.is_superuser)
def gallery_view(request, slug=""):
    context = {"slug": slug}
    if request.method == "POST" and request.FILES.get("zipfile"):
        gal = get_object_or_404(Gallery, slug=slug)
        file = request.FILES["zipfile"]
        fs = FileSystemStorage()
        # Keep the name save() returns and ask the storage for its path. Going
        # through fs.url() percent-encodes accents and spaces, and the encoded
        # name is not a file on disk.
        filename = fs.save(file.name, file)
        try:
            load_zip_into_gallery(fs.path(filename), gal)
        except zipfile.BadZipFile:
            return HttpResponseBadRequest("Le fichier envoyé n'est pas un zip valide.")
        finally:
            fs.delete(filename)
    return render(request, "gestiongallery.html", context)
