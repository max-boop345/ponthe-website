import zipfile

from api.models import Gallery
from api.permissions import is_manager
from django.contrib.auth.decorators import user_passes_test
from django.core.files.storage import FileSystemStorage
from django.http import Http404, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from galerie.loader import load_zip_into_gallery

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 Mo


@user_passes_test(is_manager)
def index_view(request):
    return render(request, "gestionindex.html")


def _wants_json(request):
    """Une requête AJAX (fetch/XHR) demande une réponse JSON."""
    return request.headers.get("X-Requested-With") == "XMLHttpRequest"


@user_passes_test(is_manager)
def gallery_view(request, slug=""):
    context = {"slug": slug}
    if request.method == "POST" and request.FILES.get("zipfile"):
        wants_json = _wants_json(request)
        gal = Gallery.objects.filter(slug=slug).first()
        if gal is None:
            if wants_json:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": f"Galerie « {slug} » introuvable.",
                    },
                    status=404,
                )
            raise Http404
        file = request.FILES["zipfile"]

        # --- Validations ---
        if file.size == 0:
            return _upload_error(wants_json, "Le fichier envoyé est vide.")
        if not file.name.lower().endswith(".zip"):
            return _upload_error(
                wants_json, "Le fichier doit être une archive .zip."
            )
        if file.size > MAX_UPLOAD_SIZE:
            return _upload_error(
                wants_json,
                f"Le fichier dépasse la taille maximale autorisée "
                f"({MAX_UPLOAD_SIZE // (1024 * 1024)} Mo).",
            )

        fs = FileSystemStorage()
        # Keep the name save() returns and ask the storage for its path. Going
        # through fs.url() percent-encodes accents and spaces, and the encoded
        # name is not a file on disk.
        filename = fs.save(file.name, file)
        try:
            load_zip_into_gallery(fs.path(filename), gal)
        except zipfile.BadZipFile:
            return _upload_error(
                wants_json, "Le fichier envoyé n'est pas un zip valide."
            )
        except Exception:
            # Unexpected error (disk full, Celery broker, ...): keep the
            # JSON contract for AJAX requests.
            if wants_json:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "Une erreur est survenue lors de l'envoi.",
                    },
                    status=500,
                )
            raise
        finally:
            fs.delete(filename)

        if wants_json:
            return JsonResponse({"status": "success"})

    return render(request, "gestiongallery.html", context)


def _upload_error(wants_json, message):
    """Retourne une erreur 400 en JSON (AJAX) ou en HTML brut (fallback)."""
    if wants_json:
        return JsonResponse({"status": "error", "message": message}, status=400)
    return HttpResponseBadRequest(message)
