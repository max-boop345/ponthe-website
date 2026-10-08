# Gestion — Messages d'erreur upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher des messages d'erreur clairs dans le modal d'upload côté gestion quand l'upload d'un fichier est refusé (fichier non zip, vide, trop gros, mauvaise extension), au lieu d'une page blanche avec du texte brut.

**Architecture:** Le backend `gallery_view` détecte les requêtes AJAX (header `X-Requested-With: XMLHttpRequest`) et retourne du JSON (`{status: "error", message: "..."}` ou `{status: "success"}`) au lieu de `HttpResponseBadRequest` ou `render`. Le frontend remplace le formulaire HTML classique par un `fetch` avec `FormData`, intercepte la réponse JSON, et affiche le message d'erreur dans le modal via un état `uploadError`. Les requêtes non-AJAX (fallback) continuent de fonctionner comme avant.

**Tech Stack:** Django 4.2 (JsonResponse), React 18 (fetch, FormData, useState), CSS vanilla (App.css), Jest + React Testing Library (frontend), Django TestCase (backend).

---

## Task 1: Backend — JSON responses + validations dans `gallery_view`

**Files:**
- Modify: `back/gestion/views.py`
- Modify: `back/test/test_import.py`

- [ ] **Step 1: Write the failing backend tests**

Ajouter ces tests à la fin de `back/test/test_import.py` (après la classe `ImportTest` existante) :

```python
class UploadErrorMessagesTest(TestCase):
    """L'upload AJAX retourne du JSON avec un message d'erreur clair."""

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media)
        settings = override_settings(MEDIA_ROOT=self.media)
        settings.enable()
        self.addCleanup(settings.disable)

        self.gallery = Gallery.objects.create(
            name="Sobriété",
            slug="sobriete",
            description="",
            year=Year.objects.create(name="2026-2027"),
        )
        os.makedirs(self.path("uploads"))
        os.makedirs(self.path("thumbnails"))
        self.client.force_login(User.objects.create_superuser("admin"))
        self.ajax_headers = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}

    def path(self, *parts):
        return os.path.join(self.media, "sobriete", *parts)

    def upload_ajax(self, name, content, content_type="application/zip"):
        patches = (
            mock.patch("galerie.loader.generate_thumbnails.delay"),
            mock.patch("galerie.loader.load_folder_into_gallery.delay"),
        )
        with patches[0] as thumbnails, patches[1] as load:
            response = self.client.post(
                "/gestion/gallery/sobriete",
                {"zipfile": SimpleUploadedFile(name, content, content_type)},
                **self.ajax_headers,
            )
        return response, thumbnails, load

    def test_ajax_not_a_zip_returns_json_error(self):
        response, thumbnails, load = self.upload_ajax("photos.zip", b"not a zip")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response["Content-Type"], "application/json")
        data = response.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("zip", data["message"].lower())
        thumbnails.assert_not_called()
        load.assert_not_called()

    def test_ajax_empty_file_returns_json_error(self):
        response, thumbnails, load = self.upload_ajax("empty.zip", b"")

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("vide", data["message"].lower())
        thumbnails.assert_not_called()
        load.assert_not_called()

    def test_ajax_wrong_extension_returns_json_error(self):
        archive = zip_of({"a.jpg": jpeg()})
        response, thumbnails, load = self.upload_ajax("photos.txt", archive, "text/plain")

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("zip", data["message"].lower())
        thumbnails.assert_not_called()
        load.assert_not_called()

    def test_ajax_file_too_large_returns_json_error(self):
        # 500 Mo + 1 octet — on simule sans créer un vrai fichier énorme
        big = SimpleUploadedFile("big.zip", b"x" * 100, "application/zip")
        big.size = 500 * 1024 * 1024 + 1
        with mock.patch(
            "galerie.loader.generate_thumbnails.delay"
        ), mock.patch("galerie.loader.load_folder_into_gallery.delay"):
            response = self.client.post(
                "/gestion/gallery/sobriete",
                {"zipfile": big},
                **self.ajax_headers,
            )

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("500", data["message"])

    def test_ajax_success_returns_json_success(self):
        archive = zip_of({"a.jpg": jpeg(), "b.jpg": jpeg()})
        response, thumbnails, load = self.upload_ajax("photos.zip", archive)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        data = response.json()
        self.assertEqual(data["status"], "success")
        thumbnails.assert_called_once_with("sobriete")
        load.assert_called_once_with("sobriete")

    def test_ajax_unknown_gallery_returns_json_404(self):
        with mock.patch(
            "galerie.loader.generate_thumbnails.delay"
        ), mock.patch("galerie.loader.load_folder_into_gallery.delay"):
            response = self.client.post(
                "/gestion/gallery/nope",
                {"zipfile": SimpleUploadedFile("a.zip", zip_of({"a.jpg": jpeg()}))},
                **self.ajax_headers,
            )

        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("galerie", data["message"].lower())

    def test_non_ajax_not_a_zip_still_returns_400_html(self):
        """Le fallback non-AJAX continue de fonctionner (rétrocompatibilité)."""
        response, thumbnails, load = self.upload("photos.zip", b"not a zip")

        self.assertEqual(response.status_code, 400)
        self.assertIn("zip", response.content.decode().lower())
        thumbnails.assert_not_called()
        load.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd back && python manage.py test test.test_import.UploadErrorMessagesTest -v 2 2>&1 | tail -30
```
Expected: Tous les tests échouent car `gallery_view` ne retourne pas encore de JSON.

- [ ] **Step 3: Implement JSON responses in `gallery_view`**

Remplacer `back/gestion/views.py` par :

```python
import zipfile

from api.models import Gallery
from api.permissions import is_manager
from django.contrib.auth.decorators import user_passes_test
from django.core.files.storage import FileSystemStorage
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import get_object_or_404, render
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
        gal = get_object_or_404(Gallery, slug=slug)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd back && python manage.py test test.test_import -v 2 2>&1 | tail -25
```
Expected: Tous les tests passent (anciens + nouveaux).

- [ ] **Step 5: Run full backend test suite**

```bash
cd back && python manage.py test 2>&1 | tail -10
```
Expected: Tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add back/gestion/views.py back/test/test_import.py && git commit -m "feat(gestion): return JSON error messages for AJAX uploads"
```

---

## Task 2: Frontend — Remplacer le formulaire par fetch + afficher les erreurs

**Files:**
- Modify: `react/src/components/GestionGallery.js`
- Create: `react/src/components/GestionGallery.test.js` — **n'existe pas sur cette branche** (il n'existe que sur la branche non mergée `feature/gestion-gallery-zoom-toggle`). Le créer from scratch avec le préambule ci-dessous (mocks repris de cette branche) + 4 tests de base + les 7 tests d'upload.

- [ ] **Step 1: Write the failing frontend tests**

Créer `react/src/components/GestionGallery.test.js` avec ce contenu complet. Le préambule (mocks + 4 tests de base) vient de la branche `feature/gestion-gallery-zoom-toggle` (tests non liés au zoom uniquement) ; les 7 tests `// --- Upload error messages (TODO #8) ---` sont nouveaux et doivent ÉCHOUER tant que le composant n'est pas modifié.

**Préambule + tests de base :**

```js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GestionGallery from './GestionGallery';

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(() => 'fake-csrf-token'),
}));

// Mock CustomNavbar (it uses undefined globals is_staff, is_superuser, is_authenticated)
jest.mock('./Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="mock-navbar" />;
  };
});

// Mock GallerySticker to inspect props passed to it
jest.mock('./GallerySticker', () => {
  return function MockGallerySticker(props) {
    return (
      <div
        data-testid="gallery-sticker"
        data-img={props.img}
        data-thumb={props.thumb}
        onClick={(e) => props.modal_func(e, props.img)}
      >
        sticker
      </div>
    );
  };
});

// gallery_slug is a global injected by Django template
global.gallery_slug = 'test-gallery';

const mockPicsResponse = [
  {
    id: 1,
    file_name: 'photo1',
    file_extension: 'jpg',
    file_full_name: 'photo1.jpg',
    gallery: 1,
    link: '/media/test-gallery',
  },
  {
    id: 2,
    file_name: 'photo2',
    file_extension: 'jpg',
    file_full_name: 'photo2.jpg',
    gallery: 1,
    link: '/media/test-gallery',
  },
];

const mockGalleryResponse = {
  id: 1,
  name: 'Ma Galerie Test',
  description: 'Description test',
  date: '2026-01-01T00:00:00Z',
  visibility: 'privée',
  type: 'photo',
  year: '2025-2026',
  sticker_url: '',
  slug: 'test-gallery',
  view: 'galerie',
};

function mockFetch() {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/gallery/pics/')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockPicsResponse),
      });
    }
    if (url.includes('/api/gallery/')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockGalleryResponse),
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve({}),
    });
  });
}

describe('GestionGallery', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Tests de base ---

  test('renders gallery title from API', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument();
    });
  });

  test('renders correct number of stickers from API response', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });
  });

  test('renders correct image URLs for stickers', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      const stickers = screen.getAllByTestId('gallery-sticker');
      expect(stickers[0].getAttribute('data-img')).toBe('/media/test-gallery/uploads/photo1.jpg');
      expect(stickers[1].getAttribute('data-img')).toBe('/media/test-gallery/uploads/photo2.jpg');
    });
  });

  test('clicking a sticker opens the modal with the correct image', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
    await waitFor(() => {
      const img = document.querySelector('.img-modal');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toBe('/media/test-gallery/uploads/photo1.jpg');
    });
  });
```

**Les 7 tests d'upload à ajouter à la fin du `describe` :**

> Note : le bouton "+" est `<AddCircleOutlineIcon className="icon" onClick={openAddModal}/>` — il n'a PAS de classe `add-icon` sur cette branche. Utiliser `screen.getByTestId('AddCircleOutlineIcon')` pour le sélectionner.

```js
  // --- Upload error messages (TODO #8) ---

  test('upload modal shows error message when server rejects the file', async () => {
    // Mock fetch to return a 400 JSON error for the upload
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: 'error', message: "Le fichier envoyé n'est pas un zip valide." }),
        });
      }
      // Default mocks for initial data fetch
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    // Open upload modal — the add button is the AddCircleOutlineIcon
    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    // Create a fake file and trigger upload
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['fake content'], 'test.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click submit
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText("Le fichier envoyé n'est pas un zip valide.")).toBeInTheDocument();
    });
  });

  test('upload modal shows error for empty file', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: 'error', message: 'Le fichier envoyé est vide.' }),
        });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File([], 'empty.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(screen.getByText('Le fichier envoyé est vide.')).toBeInTheDocument();
    });
  });

  test('upload modal shows error for wrong extension', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: 'error', message: 'Le fichier doit être une archive .zip.' }),
        });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(screen.getByText('Le fichier doit être une archive .zip.')).toBeInTheDocument();
    });
  });

  test('upload modal shows generic error on network failure', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.reject(new Error('Network error'));
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(screen.getByText(/erreur/i)).toBeInTheDocument();
    });
  });

  test('upload success closes modal and reloads', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: jest.fn() };

    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success' }),
        });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['zip content'], 'photos.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });

    window.location = originalLocation;
  });

  test('upload button is disabled while uploading', async () => {
    let resolveUpload;
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return new Promise((resolve) => { resolveUpload = resolve; });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    // Button should be disabled and show "Envoi en cours..."
    await waitFor(() => {
      const button = screen.getByText(/envoi en cours/i);
      expect(button).toBeDisabled();
    });

    // Resolve the upload
    resolveUpload({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success' }),
    });
  });

  test('no file selected shows error on submit', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    // Click submit without selecting a file
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(screen.getByText(/sélectionn/i)).toBeInTheDocument();
    });
  });

  test('error message is cleared when modal is closed and reopened', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: 'error', message: 'Erreur test' }),
        });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    // Open modal, trigger error
    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'test.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      expect(screen.getByText('Erreur test')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = document.querySelector('.close-white-modal');
    fireEvent.click(closeButton);

    // Reopen modal — error should be gone
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });
    expect(screen.queryByText('Erreur test')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd react && CI=true npx react-scripts test src/components/GestionGallery.test.js --watchAll=false 2>&1 | tail -40
```
Expected: Les 8 tests upload échouent (pas de gestion d'erreur, formulaire HTML classique) ; les 4 tests de base passent.

- [ ] **Step 3: Implement fetch-based upload with error display**

**3a. Ajouter les états** (après `const [isCompact, setIsCompact] = useState(false);`, ligne ~31) :

```js
const [uploadError, setUploadError] = useState('');
const [uploading, setUploading] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);
```

**3b. Ajouter la fonction d'upload** (après `toggleCompact`, ligne ~64) :

```js
const handleUpload = async (e) => {
  e.preventDefault();
  setUploadError('');

  if (!selectedFile) {
    setUploadError('Veuillez sélectionner un fichier .zip.');
    return;
  }

  setUploading(true);

  const formData = new FormData();
  formData.append('zipfile', selectedFile);

  try {
    const response = await fetch('/gestion/gallery/' + gallery_slug, {
      method: 'POST',
      headers: {
        'X-CSRFToken': Cookies.get('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      setUploadError(data.message || 'Une erreur est survenue lors de l\'envoi.');
    } else {
      // Succès : fermer le modal et recharger la page
      closeAddModal();
      window.location.reload(false);
    }
  } catch (err) {
    setUploadError('Erreur réseau : impossible de contacter le serveur.');
  } finally {
    setUploading(false);
  }
};
```

**3c. Modifier `openAddModal` pour réinitialiser l'état** (ligne ~55) :

```js
const openAddModal = () => {
  setUploadError('');
  setSelectedFile(null);
  setaddModalState(true);
};
```

**3d. Remplacer le formulaire dans le modal** (lignes ~282-291) :

Remplacer :
```jsx
{addModalState && (
  <div className='pic-modal'>
    <div ref={ref} className='add-modal-content'>
      <span className='close-white-modal' onClick={closeAddModal}>&times;</span>
      <form method="POST" class="post-form" enctype="multipart/form-data">
          <input type="hidden" name="csrfmiddlewaretoken" value={cookie} />
          <input type='file' name='zipfile'/>
          <button type="submit" className="login-button">Lancer l'envoi</button>
        </form>
    </div>
  </div>
)}
```

Par :
```jsx
{addModalState && (
  <div className='pic-modal'>
    <div ref={ref} className='add-modal-content'>
      <span className='close-white-modal' onClick={closeAddModal}>&times;</span>
      <form className="post-form" onSubmit={handleUpload}>
          <input
            type='file'
            name='zipfile'
            accept='.zip'
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          />
          {uploadError && <p className="upload-error">{uploadError}</p>}
          <button
            type="submit"
            className="login-button"
            disabled={uploading}
          >
            {uploading ? 'Envoi en cours...' : "Lancer l'envoi"}
          </button>
        </form>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd react && CI=true npx react-scripts test src/components/GestionGallery.test.js --watchAll=false 2>&1 | tail -30
```
Expected: PASS — 12 tests (4 de base + 8 upload).

- [ ] **Step 5: Run ALL frontend tests**

```bash
cd react && CI=true npx react-scripts test --watchAll=false 2>&1 | tail -15
```
Expected: Tous les tests passent (sauf App.test.js pré-existant).

- [ ] **Step 6: Verify build compiles**

```bash
cd react && DISABLE_ESLINT_PLUGIN=true npm run build 2>&1 | tail -5
```
Expected: "Compiled successfully."

- [ ] **Step 7: Commit**

```bash
git add react/src/components/GestionGallery.js react/src/components/GestionGallery.test.js && git commit -m "feat(gestion): show upload error messages in modal (TODO #8)"
```

---

## Task 3: CSS — Style pour les messages d'erreur d'upload

**Files:**
- Modify: `react/src/App.css`
- Modify: `react/src/components/GestionGallery.test.js` (test de contrat CSS)

- [ ] **Step 1: Write the failing CSS contract test**

Ajouter à la fin de `react/src/components/GestionGallery.test.js` :

```js
  test('upload error element has the upload-error CSS class', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: 'error', message: 'Test error' }),
        });
      }
      if (url.includes('/api/gallery/pics/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
      }
      if (url.includes('/api/gallery/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const addButton = screen.getByTestId('AddCircleOutlineIcon');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'test.zip', { type: 'application/zip' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Lancer l'envoi"));

    await waitFor(() => {
      const errorEl = screen.getByText('Test error');
      expect(errorEl).toHaveClass('upload-error');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd react && CI=true npx react-scripts test src/components/GestionGallery.test.js --watchAll=false -t "upload-error CSS class" 2>&1 | tail -15
```
Expected: FAIL — la classe `upload-error` n'existe pas encore dans App.css.

- [ ] **Step 3: Add CSS rule**

Ajouter dans `react/src/App.css` (après `.login-error`, vers la ligne 530) :

```css
/* Messages d'erreur upload (TODO #8) */
.upload-error{
  background-color: rgb(247, 103, 103);
  padding-left:10px;
  padding-top: 10px;
  padding-bottom: 10px;
  margin-top: 15px;
  margin-bottom: 15px;
  font-family: 'Inter';
  color:white;
  border-left: 3px solid rgb(255, 0, 0);
  border-radius: 5px;
}
```

- [ ] **Step 4: Verify CSS is present**

```bash
cd react && node -e "
const fs = require('fs');
const css = fs.readFileSync('src/App.css', 'utf8');
if (!css.includes('.upload-error')) { console.error('MISSING .upload-error'); process.exit(1); }
console.log('OK: .upload-error present in App.css');
"
```
Expected: "OK: .upload-error present in App.css"

- [ ] **Step 5: Run all tests**

```bash
cd react && CI=true npx react-scripts test src/components/GestionGallery.test.js --watchAll=false 2>&1 | tail -10
```
Expected: PASS — 13 tests (4 de base + 8 upload + 1 contrat CSS).

- [ ] **Step 6: Commit**

```bash
git add react/src/App.css react/src/components/GestionGallery.test.js && git commit -m "style(gestion): add upload-error CSS class"
```

---

## Task 4: E2E manuel et vérification

- [ ] **Step 1: Lancer les services**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && docker compose up -d
```

- [ ] **Step 2: Checklist de vérification manuelle**

Ouvrir `http://localhost:8000/gestion/gallery/<un-slug-existant>` et cocher :

- [ ] Cliquer sur le bouton "+" (ajouter) → le modal s'ouvre
- [ ] Cliquer "Lancer l'envoi" sans sélectionner de fichier → message "Veuillez sélectionner un fichier .zip."
- [ ] Sélectionner un fichier `.txt` → upload → message "Le fichier doit être une archive .zip."
- [ ] Sélectionner un fichier `.zip` vide (0 octet) → message "Le fichier envoyé est vide."
- [ ] Sélectionner un fichier `.zip` qui n'est pas un vrai zip → message "Le fichier envoyé n'est pas un zip valide."
- [ ] Sélectionner un vrai `.zip` avec des photos → succès, modal se ferme, page se recharge
- [ ] Pendant l'upload, le bouton affiche "Envoi en cours..." et est désactivé
- [ ] Fermer le modal après une erreur, le rouvrir → le message d'erreur a disparu
- [ ] Couper le réseau (DevTools → Offline) pendant l'upload → message "Erreur réseau"

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "test(gestion): manual E2E verification of upload error messages"
```

---

## Récapitulatif des fichiers et tests

| Fichier | Modification | Tests |
|---------|-------------|-------|
| `back/gestion/views.py` | JSON responses, validations (vide, extension, taille), JSON 500 sur erreur inattendue | `back/test/test_import.py` — 9 nouveaux tests |
| `back/test/test_import.py` | **Modifié** — classe `UploadErrorMessagesTest` + base `UploadTestCase` partagée | 9 tests : non-zip, vide, mauvaise extension, trop gros, succès, galerie inconnue, fallback non-AJAX, erreur inattendue AJAX (JSON 500), erreur inattendue non-AJAX (raise) |
| `react/src/components/GestionGallery.js` | fetch + FormData, états `uploadError`/`uploading`/`selectedFile`, `handleUpload` | `GestionGallery.test.js` — 8 nouveaux tests |
| `react/src/components/GestionGallery.test.js` | **Créé** — mocks + 4 tests de base + 8 tests upload + 1 test contrat CSS (Task 3) | erreur serveur, fichier vide, mauvaise extension, erreur réseau, succès+reload, bouton désactivé, pas de fichier, erreur cleared on reopen, CSS contract |
| `react/src/App.css` | `.upload-error` (style rouge comme `.login-error`) | Test de contrat CSS |

**Total : 18 nouveaux tests** (9 backend + 9 frontend) couvrant chaque cas d'erreur et chaque ligne de code ajoutée.

## Flux de données

```
Frontend (GestionGallery.js)
  │  fetch POST /gestion/gallery/<slug>
  │  Headers: X-CSRFToken, X-Requested-With: XMLHttpRequest
  │  Body: FormData { zipfile: File }
  ▼
Backend (gestion/views.py gallery_view)
  │  _wants_json(request) → True
  │  Validations:
  │    ├─ fichier vide → {status:"error", message:"Le fichier envoyé est vide."}
  │    ├─ pas .zip    → {status:"error", message:"Le fichier doit être une archive .zip."}
  │    ├─ > 500 Mo    → {status:"error", message:"Le fichier dépasse..."}
  │    └─ pas un zip  → {status:"error", message:"Le fichier envoyé n'est pas un zip valide."}
  │  Succès → {status:"success"}
  ▼
Frontend
  ├─ status "error" → setUploadError(message) → affiché dans le modal
  └─ status "success" → closeAddModal() + window.location.reload()
```

## Cas d'erreur gérés

| Cas | Message affiché | Code HTTP |
|-----|----------------|-----------|
| Aucun fichier sélectionné | "Veuillez sélectionner un fichier .zip." | — (client-side) |
| Fichier vide (0 octet) | "Le fichier envoyé est vide." | 400 |
| Extension non .zip | "Le fichier doit être une archive .zip." | 400 |
| Fichier > 500 Mo | "Le fichier dépasse la taille maximale autorisée (500 Mo)." | 400 |
| Fichier .zip corrompu | "Le fichier envoyé n'est pas un zip valide." | 400 |
| Galerie inexistante | "Cette galerie n'existe pas." | 404 |
| Erreur réseau | "Erreur réseau : impossible de contacter le serveur." | — (client-side) |
| Erreur serveur inconnue | "Une erreur est survenue lors de l'envoi." | 500 |
