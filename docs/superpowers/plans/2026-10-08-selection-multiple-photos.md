# Sélection multiple de photos (galeries + gestion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre la sélection de plusieurs photos à la fois, comme sur l'app Photos d'iOS : un bouton « Sélectionner » bascule en mode sélection, puis chaque clic sur une vignette la sélectionne/désélectionne. En galerie publique on peut télécharger la sélection (un zip) ; en gestion on peut la télécharger et en plus la supprimer en masse. En gestion, le drapeau de signalement devient un filtre : cliquer n'affiche que les photos signalées, recliquer revient au mode normal.

**Architecture:** Deux nouvelles routes API Django : `POST /api/gallery/pics/download/` (zip des photos sélectionnées, accessible à quiconque peut voir la galerie) et `POST /api/gallery/pics/delete_many/` (suppression en masse, gestionnaires uniquement). Côté front, le composant partagé `GallerySticker` gagne des props optionnelles de sélection (rétrocompatibles) ; l'état de sélection vit dans `Gallery.js` (galeries) et `GestionGallery.js` (gestion). Le filtre « photos signalées » en gestion réutilise l'endpoint existant `/api/gallery/reports/` : le front déduit localement les noms de fichiers signalés, aucun changement backend.

**Tech Stack:** Backend : Django 4.2, Django REST Framework (vues fonction, session auth), `zipfile` de la stdlib. Front : React 18 (CRA), react-bootstrap, MUI icons, `js-cookie`. Tests : Django TestCase (backend, dans Docker), Jest + React Testing Library (frontend).

---

## Contexte pour l'ingénieur (zéro contexte requis)

### Le projet
Site photo du club Ponthé de l'École des Ponts. Trois briques : backend Django (`back/`), frontend React (`react/`), Docker Compose. La branche de travail est `master`, dépôt `ponthe-website` à la racine de ce checkout.

### Ce qui existe déjà et qu'on réutilise
- **Modèles** (`back/api/models.py`) : `Gallery` (a un `slug`, une `visibility` et la méthode `can_user_access(user)` — LA règle d'accès unique), `File` (une photo : `file_full_name`, `link` = `/media/<slug>`, FK `gallery`). `Report` (un signalement : `file_full_name` sérialisé, `reporter`, `category`, `message`).
- **Vues API** (`back/api/views.py`) : vues fonction `@api_view`. Pattern établi : `@permission_classes([AllowAny])` + vérification manuelle `can_user_access` pour les routes ouvertes, `@permission_classes([IsManager])` pour les routes de gestion. Erreurs en JSON français : `{"status": "error", "message": "..."}`. La constante `FORBIDDEN_GALLERY` existe déjà pour les 403 d'accès.
- **Chemins disque** : `galerie/loader.py` expose `gallery_path(slug, *parts)` qui construit le chemin absolu sous `settings.MEDIA_ROOT` (utilisé pour lire `uploads/<file_full_name>`). `views.py` importe déjà `galerie.loader as loader`.
- **Routes** (`back/api/urls.py`) : `path("gallery/pics/delete/", delete_pic)` etc., toutes préfixées `/api/` par `back/galerie/urls.py`.
- **Tests backend** (`back/test/`) : Django `TestCase`, helper `post_json(client, url, data)` dans `back/test/test_api.py`, fixtures dans `setUpTestData`. Les tests de signalements (`test_reports.py`) montrent le pattern des galerie publique/privée.
- **Front galerie publique** : `react/src/pages/gallery.js` monte `Gallery.js` qui fetch les photos puis rend `PictureMosaic.js` (qui construit les `<Col>`/`GallerySticker` dans un `useEffect` dépendant de `props.result`). Le clic sur une vignette appelle `props.modal_func(event, props.img)` et ouvre le modal plein écran. Variables globales `gallery_slug` et `is_authenticated` injectées par les templates Django.
- **Front gestion** : `react/src/pages/gestiongallery.js` monte `GestionGallery.js` (réservée gestionnaires). Barre d'icônes MUI dans le header (`AddCircleOutlineIcon`, `DeleteIcon`, `FlagIcon`, zoom, deux `<Select>`). Le drapeau appelle aujourd'hui `loadReports()` qui ouvre un modal listant les signalements (`ReportList`). Icônes MUI accessibles en test par `screen.getByTestId('NomIcon')`.
- **CSS** (`react/src/App.css`) : `.gallery-sticker`, `.gallery-img`, `.gallery-sticker.compact`, `.icon`, `.centered-button`, `.login-button`, `.pic-modal` etc.

### Comment lancer l'environnement de dev (nécessaire pour les tests backend)
Le backend exige PostgreSQL et Redis : les tests backend **doivent** tourner dans le conteneur Docker, pas sur la machine hôte.

```bash
cd /Users/maxime/mistral_sb/ponthe-website
cp .env.example .env   # si pas déjà fait ; valeurs de dev déjà correctes (DB_HOST=db, REDIS_HOST=redis)
docker compose up -d --build
docker compose ps      # services db, redis, back, celery-worker up
```

Lancer les tests backend :
```bash
docker compose exec back python manage.py test test.test_selection -v 2
```

### Comment lancer les tests frontend
```bash
cd /Users/maxime/mistral_sb/ponthe-website/react
npm install        # une seule fois si node_modules absent
CI=true npm test -- GallerySticker       # exécute les tests du composant, sans watch mode
CI=true npm test -- --watchAll=false     # toute la suite
```

### Conventions de commit
Messages en français, style des messages existants (ex. « Signalement : tâche 9 du TODO terminée »). Un commit par tâche, à la fin de chaque tâche.

### Décisions de conception (verrouillées)
- **Téléchargement = un seul zip** via `POST /api/gallery/pics/download/` avec `{slug, file_full_names: [...]}`. Un fichier manquant sur disque ou en base est ignoré silencieusement ; si AUCUNE photo de la sélection n'existe → 404. Accès = `can_user_access` (un anonyme peut télécharger depuis une galerie publique, même règle que pour la voir).
- **Suppression en masse** via `POST /api/gallery/pics/delete_many/` (IsManager), payload `{slug, file_full_names: [...]}`. Elle **ne supprime que les lignes en base**, exactement comme `delete_pic` existant (qui porte déjà un `TODO DELETE FILE CONCERNED`) : ne pas « corriger » ce TODO ici, rester cohérent avec l'existant.
- **Payload identifié par `slug`** (pas par `name`) : c'est le choix des endpoints récents (`gallery_reports`, `change_visibility`), le slug indexe le dossier disque.
- **`GallerySticker` rétrocompatible** : les nouvelles props (`selectionMode`, `selected`, `onToggleSelect`, `fileFullName`) sont optionnelles ; sans elles le comportement est inchangé (le test contrat « class names that match CSS rules » doit rester vert).
- **Bouton « Sélectionner »** : icône MUI `ChecklistIcon` dans le header de chaque page. Quitter le mode sélection vide la sélection.
- **Le drapeau en gestion devient un filtre toggle** (photos signalées uniquement → re-clic → retour normal). Le modal détaillé `ReportList` reste accessible via un bouton `ListIcon` « Détails des signalements » qui n'apparaît que lorsque le filtre est actif.
- **Pas de « Tout sélectionner »** ni de pagination : hors périmètre (YAGNI).
- **Pas de nouvelle migration** : aucun modèle n'est modifié.

---

## File Structure

```
back/api/views.py                      # + download_pics, delete_pics (Task 1, 2)
back/api/urls.py                       # + 2 routes (Task 1, 2)
back/test/test_selection.py            # nouveau : tests des 2 endpoints (Task 1, 2)
react/src/components/GallerySticker.js # props de sélection (Task 3)
react/src/components/GallerySticker.test.js # + tests sélection (Task 3)
react/src/App.css                      # styles sélection + filtre actif (Task 3)
react/src/components/Gallery.js        # mode sélection + téléchargement (Task 4)
react/src/components/PictureMosaic.js  # transmission des props de sélection (Task 4)
react/src/components/PictureMosaic.test.js # + tests sélection (Task 4)
react/src/components/Gallery.test.js   # nouveau : bouton Sélectionner + téléchargement (Task 4)
react/src/components/GestionGallery.js # sélection + téléchargement + suppression (Task 5), filtre drapeau (Task 6)
react/src/components/GestionGallery.test.js # + tests sélection/suppression/filtre (Task 5, 6)
TODO.md                                # retirer la ligne du TODO accomplie (Task 7)
```

---

### Task 1: Backend — téléchargement zip des photos sélectionnées

**Files:**
- Create: `back/test/test_selection.py`
- Modify: `back/api/views.py` (imports en tête + nouvelle vue `download_pics` après `delete_pic`)
- Modify: `back/api/urls.py` (import + route)

- [ ] **Step 1: Écrire le test échouant**

Créer `back/test/test_selection.py` :

```python
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
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `docker compose exec back python manage.py test test.test_selection -v 2`
Expected: FAIL — erreurs 404 sur tous les appels à `/api/gallery/pics/download/` (la route n'existe pas).

- [ ] **Step 3: Implémenter la vue**

Dans `back/api/views.py`, compléter les imports en tête de fichier (le bloc `import os` existe déjà) :

```python
import io
import os
import zipfile

import galerie.loader as loader
import galerie.settings as settings
from api.models import File, Gallery, Report, Year
from api.permissions import IsManager, is_manager
from api.serializers import (
    FileSerializer,
    GallerySerializer,
    PromoSerializer,
    ReportSerializer,
    YearSerializer,
)
from django.db import IntegrityError
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.defaultfilters import slugify
```

(seuls `io`, `zipfile` et `from django.http import HttpResponse` sont nouveaux ; laisser le reste tel quel).

Puis ajouter après la vue `delete_pic` :

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def download_pics(request):
    """Zip the selected pictures of a gallery, for anyone who can see them."""
    gallery = Gallery.objects.filter(slug=request.data.get("slug")).first()
    if gallery is None:
        return Response(
            {"status": "error", "message": "Cette galerie n'existe pas."}, status=404
        )
    if not gallery.can_user_access(request.user):
        return Response(FORBIDDEN_GALLERY, status=403)
    names = request.data.get("file_full_names")
    if not isinstance(names, list) or len(names) == 0:
        return Response(
            {"status": "error", "message": "Aucune photo sélectionnée."}, status=400
        )
    files = File.objects.filter(gallery=gallery, file_full_name__in=names)
    if not files.exists():
        return Response(
            {"status": "error", "message": "Aucune de ces photos n'existe."}, status=404
        )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in files:
            path = loader.gallery_path(gallery.slug, "uploads", file.file_full_name)
            if os.path.isfile(path):
                archive.write(path, arcname=file.file_full_name)
    response = HttpResponse(buffer.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = (
        f'attachment; filename="{gallery.slug}-selection.zip"'
    )
    return response
```

Dans `back/api/urls.py` : ajouter `download_pics` à l'import depuis `api.views` (ranger alphabétiquement, entre `delete_gallery` et `generate_thumbnails`), puis dans `urlpatterns` après la ligne `path("gallery/pics/delete/", delete_pic)` :

```python
    path("gallery/pics/download/", download_pics),
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `docker compose exec back python manage.py test test.test_selection -v 2`
Expected: PASS (tous les tests de `test_selection.py`).

- [ ] **Step 5: Commit**

```bash
git add back/api/views.py back/api/urls.py back/test/test_selection.py
git commit -m "Sélection multiple : téléchargement en zip des photos sélectionnées (API)"
```

---

### Task 2: Backend — suppression en masse des photos sélectionnées

**Files:**
- Modify: `back/test/test_selection.py` (ajouter une classe de test)
- Modify: `back/api/views.py` (nouvelle vue `delete_pics`)
- Modify: `back/api/urls.py` (import + route)

- [ ] **Step 1: Écrire le test échouant**

Ajouter à la fin de `back/test/test_selection.py` :

```python
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
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `docker compose exec back python manage.py test test.test_selection.DeletePicsTest -v 2`
Expected: FAIL — erreurs 404 (la route `/api/gallery/pics/delete_many/` n'existe pas).

- [ ] **Step 3: Implémenter la vue**

Dans `back/api/views.py`, ajouter juste après `download_pics` :

```python
@api_view(["POST"])
@permission_classes([IsManager])
def delete_pics(request):
    """Bulk version of delete_pic: the manager selected several at once."""
    gallery = Gallery.objects.filter(slug=request.data.get("slug")).first()
    if gallery is None:
        return Response(
            {"status": "error", "message": "Cette galerie n'existe pas."}, status=404
        )
    names = request.data.get("file_full_names")
    if not isinstance(names, list) or len(names) == 0:
        return Response(
            {"status": "error", "message": "Aucune photo sélectionnée."}, status=400
        )
    deleted, _ = File.objects.filter(
        gallery=gallery, file_full_name__in=names
    ).delete()
    return Response({"status": "ok", "deleted": deleted})
```

Dans `back/api/urls.py` : ajouter `delete_pics` à l'import depuis `api.views` (après `delete_pic`), puis dans `urlpatterns` après la ligne `path("gallery/pics/delete/", delete_pic)` :

```python
    path("gallery/pics/delete_many/", delete_pics),
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `docker compose exec back python manage.py test test.test_selection -v 2`
Expected: PASS (toute la classe `DeletePicsTest`).

- [ ] **Step 5: Commit**

```bash
git add back/api/views.py back/api/urls.py back/test/test_selection.py
git commit -m "Sélection multiple : suppression en masse des photos sélectionnées (API)"
```

---

### Task 3: Front — `GallerySticker` sélectionnable + styles

**Files:**
- Modify: `react/src/components/GallerySticker.js`
- Modify: `react/src/components/GallerySticker.test.js`
- Modify: `react/src/App.css`

- [ ] **Step 1: Écrire les tests échouants**

Ajouter à la fin du `describe('GallerySticker', ...)` dans `react/src/components/GallerySticker.test.js` (le fichier importe déjà `render`, `fireEvent`, et `defaultProps` contient déjà `img`, `thumb`, `modal_func`) :

```jsx
  test('in selection mode, clicking calls onToggleSelect instead of modal_func', () => {
    const modalFunc = jest.fn();
    const onToggleSelect = jest.fn();
    const { container } = render(
      <GallerySticker
        {...defaultProps}
        modal_func={modalFunc}
        selectionMode={true}
        selected={false}
        onToggleSelect={onToggleSelect}
        fileFullName="photo.jpg"
      />
    );
    fireEvent.click(container.querySelector('.gallery-sticker'));
    expect(onToggleSelect).toHaveBeenCalledWith('photo.jpg');
    expect(modalFunc).not.toHaveBeenCalled();
    expect(container.querySelector('.img-modal')).not.toBeInTheDocument();
  });

  test('selected sticker gets the selected class and a check icon', () => {
    const { container } = render(
      <GallerySticker
        {...defaultProps}
        selectionMode={true}
        selected={true}
        onToggleSelect={jest.fn()}
        fileFullName="photo.jpg"
      />
    );
    expect(container.querySelector('.gallery-sticker.selected')).toBeInTheDocument();
    expect(container.querySelector('.sticker-check')).toBeInTheDocument();
  });

  test('selection class names match CSS rules in App.css', () => {
    // Même contrat que le test compact : renommer les classes doit faire échouer ici.
    const { container } = render(
      <GallerySticker
        {...defaultProps}
        selectionMode={true}
        selected={true}
        onToggleSelect={jest.fn()}
        fileFullName="photo.jpg"
      />
    );
    const sticker = container.querySelector('.gallery-sticker');
    const check = container.querySelector('.sticker-check');
    expect(sticker.className).toBe('gallery-sticker selected');
    expect(check.className).toBe('sticker-check');
  });
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd react && CI=true npm test -- GallerySticker`
Expected: FAIL — `onToggleSelect` n'est jamais appelé (le clic appelle toujours `modal_func`), pas de classe `selected` ni de `.sticker-check`.

- [ ] **Step 3: Implémenter**

Remplacer tout le contenu de `react/src/components/GallerySticker.js` par :

```jsx
import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GallerySticker = (props) => {
    const compactClass = props.compact ? ' compact' : '';
    const selectedClass = props.selected ? ' selected' : '';
    const handleClick = (event) => {
      if (props.selectionMode) {
        props.onToggleSelect(props.fileFullName);
      } else {
        props.modal_func(event, props.img);
      }
    };
    return(
            <div className={'gallery-sticker' + compactClass + selectedClass} onClick={handleClick}>
                {props.selectionMode && (
                  <CheckCircleIcon className={'sticker-check' + (props.selected ? '' : ' sticker-check-off')}/>
                )}
                <img loading='lazy' className={'gallery-img' + compactClass} src={props.thumb} width="100%"/>
            </div>
    );
};

export default GallerySticker;
```

Dans `react/src/App.css`, modifier la règle `.gallery-sticker` existante (ligne ~76) pour ajouter `position: relative` :

```css
.gallery-sticker{
  cursor:pointer;
  height: 170px;
  position: relative;
}
```

et ajouter à la fin du fichier :

```css
/* Mode sélection multiple : rond de validation et vignette sélectionnée */
.gallery-sticker.selected{
  outline: 4px solid #1976d2;
  outline-offset: -4px;
}

.sticker-check{
  position: absolute;
  top: 8px;
  right: 8px;
  color: #1976d2;
  background: white;
  border-radius: 50%;
  z-index: 5;
}

.sticker-check-off{
  color: #9e9e9e;
}

/* Bouton « Sélectionner » du header de la page galerie */
.select-toggle-icon{
  cursor: pointer;
  color: #d8d8d8;
  font-size: 2rem;
  vertical-align: middle;
  margin-left: 12px;
}

/* Barre d'actions de la sélection (compteur + boutons) */
.selection-bar{
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
}

/* Icône dont le mode associé est actif (ex. filtre signalements) */
.icon-active{
  color: #1976d2;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd react && CI=true npm test -- GallerySticker`
Expected: PASS — les nouveaux tests ET les tests existants (contrat compact `gallery-sticker compact` doit rester vert).

- [ ] **Step 5: Commit**

```bash
git add react/src/components/GallerySticker.js react/src/components/GallerySticker.test.js react/src/App.css
git commit -m "Sélection multiple : vignettes sélectionnables et styles"
```

---

### Task 4: Front — Galerie publique : mode sélection + téléchargement

**Files:**
- Modify: `react/src/components/Gallery.js`
- Modify: `react/src/components/PictureMosaic.js`
- Modify: `react/src/components/PictureMosaic.test.js`
- Create: `react/src/components/Gallery.test.js`

- [ ] **Step 1: Écrire les tests échouants**

Ajouter à la fin de `react/src/components/PictureMosaic.test.js` (le fichier importe déjà `render`, `screen`, `fireEvent`, `waitFor`, et définit `PICS` avec `file_full_name: 'picture.jpg'`) :

```jsx
describe('PictureMosaic selection mode', () => {
    test('in selection mode, clicking a sticker selects instead of opening the modal', () => {
        const onToggleSelect = jest.fn();
        const { container } = render(
            <PictureMosaic
                result={PICS}
                selectionMode={true}
                selected={new Set()}
                onToggleSelect={onToggleSelect}
            />
        );
        fireEvent.click(container.querySelector('.gallery-sticker'));
        expect(onToggleSelect).toHaveBeenCalledWith('picture.jpg');
        expect(container.querySelector('.img-modal')).not.toBeInTheDocument();
    });

    test('in selection mode, the selected sticker carries the selected class', () => {
        const { container } = render(
            <PictureMosaic
                result={PICS}
                selectionMode={true}
                selected={new Set(['picture.jpg'])}
                onToggleSelect={jest.fn()}
            />
        );
        expect(container.querySelector('.gallery-sticker.selected')).toBeInTheDocument();
    });

    test('outside selection mode, clicking a sticker still opens the modal', () => {
        const { container } = render(
            <PictureMosaic result={PICS} />
        );
        fireEvent.click(container.querySelector('.gallery-sticker'));
        expect(container.querySelector('.img-modal')).toBeInTheDocument();
    });
});
```

Créer `react/src/components/Gallery.test.js` :

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Gallery from './Gallery';

jest.mock('js-cookie', () => ({
  get: jest.fn(() => 'fake-csrf-token'),
}));

jest.mock('./Navbar', () => () => <div data-testid="mock-navbar" />);

// Capture les props passées à PictureMosaic
let mosaicProps;
jest.mock('./PictureMosaic', () => {
  return function MockPictureMosaic(props) {
    mosaicProps = props;
    return <div data-testid="picture-mosaic" />;
  };
});

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
  name: 'Ma Galerie Test',
};

function mockFetch() {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/gallery/pics/')) {
      return Promise.resolve({ json: () => Promise.resolve(mockPicsResponse) });
    }
    return Promise.resolve({ json: () => Promise.resolve(mockGalleryResponse) });
  });
}

describe('Gallery selection mode', () => {
  beforeEach(() => {
    mockFetch();
    URL.createObjectURL = jest.fn(() => 'blob:fake');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('the select button toggles selection mode', async () => {
    render(<Gallery />);
    await waitFor(() => expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument());

    expect(mosaicProps.selectionMode).toBe(false);
    expect(screen.queryByText('Télécharger la sélection')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    expect(mosaicProps.selectionMode).toBe(true);
    expect(screen.getByText('Télécharger la sélection')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    expect(mosaicProps.selectionMode).toBe(false);
    expect(screen.queryByText('Télécharger la sélection')).not.toBeInTheDocument();
  });

  test('download button is disabled with an empty selection', async () => {
    render(<Gallery />);
    await waitFor(() => expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    expect(screen.getByText('Télécharger la sélection')).toBeDisabled();
    expect(screen.getByText('0 photo(s) sélectionnée(s)')).toBeInTheDocument();
  });

  test('downloading the selection calls the API with the selected names', async () => {
    render(<Gallery />);
    await waitFor(() => expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    // Simuler la sélection via le callback passé au mosaic (pas de vraie vignette ici)
    mosaicProps.onToggleSelect('photo1.jpg');
    mosaicProps.onToggleSelect('photo2.jpg');
    await waitFor(() => expect(screen.getByText('2 photo(s) sélectionnée(s)')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Télécharger la sélection'));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/gallery/pics/download/',
        expect.objectContaining({ method: 'POST' })
      )
    );
    const [url, options] = global.fetch.mock.calls.find(
      ([u]) => u === '/api/gallery/pics/download/'
    );
    expect(JSON.parse(options.body)).toEqual({
      slug: 'test-gallery',
      file_full_names: ['photo1.jpg', 'photo2.jpg'],
    });
  });

  test('leaving selection mode clears the selection', async () => {
    render(<Gallery />);
    await waitFor(() => expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    mosaicProps.onToggleSelect('photo1.jpg');
    await waitFor(() => expect(screen.getByText('1 photo(s) sélectionnée(s)')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    expect(screen.getByText('0 photo(s) sélectionnée(s)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd react && CI=true npm test -- Gallery.test`
Expected: FAIL — pas de `ChecklistIcon` dans Gallery.js, `mosaicProps.selectionMode` est `undefined`.

Run: `cd react && CI=true npm test -- PictureMosaic`
Expected: les nouveaux tests de sélection FAIL (props non transmises), les tests existants PASS.

- [ ] **Step 3: Implémenter Gallery.js**

Remplacer tout le contenu de `react/src/components/Gallery.js` par :

```jsx
import React, {useState, useEffect, useRef} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Cookies from 'js-cookie';
import CustomNavbar from './Navbar';
import PictureMosaic from './PictureMosaic';
import ChecklistIcon from '@mui/icons-material/Checklist';

export default function Gallery({props}){

    //Modal open state
    const [state, setState] = useState(false);
    //Current loaded picture in modal
    const [current, setCurrent] = useState(null);
    const [picsList, setPicsList] = useState([]);
    const [pics, setPics] = useState([]);
    const [name, setName] = useState('');
    const [result, setResult] = useState([]);
    //List of picture in the gallery
    // Mode sélection multiple
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState(new Set());

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken') },
      body: JSON.stringify({ slug: gallery_slug })
    };

    //Open image in full screen when vignette is clicked
    const toggleModal = (e, img) => {
      setCurrent(img)
      setState(true)
    };

    //Close image modal
    const closeModal = () => {
      setState(false)
    };

    //Goto next picture in modal
    const nextPicture = () => {
      console.log(pics)
      let nextId = pics.indexOf(current)+1;
      if(nextId == pics.length) nextId = 0
      setCurrent(pics[nextId]);
    };

    //Goto previous picture in modal
    const previousPicture = () => {
      let nextId = pics.indexOf(current)-1;
      if(nextId == -1) nextId = pics.length-1
      setCurrent(pics[nextId]);
    };

    //Enter/leave the multi-selection mode; leaving clears the selection
    const toggleSelectionMode = () => {
      setSelectionMode(prev => !prev);
      setSelected(new Set());
    };

    //Add/remove one picture from the selection
    const toggleSelect = (fileFullName) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(fileFullName)) {
          next.delete(fileFullName);
        } else {
          next.add(fileFullName);
        }
        return next;
      });
    };

    //Download the selection as a single zip built by the backend
    const downloadSelected = async () => {
      if (selected.size === 0) return;
      const downloadOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, file_full_names: Array.from(selected) })
      };
      try {
        const response = await fetch('/api/gallery/pics/download/', downloadOptions);
        if (!response.ok) {
          alert('Impossible de télécharger les photos sélectionnées.');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = gallery_slug + '-selection.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.log(err);
        alert('Erreur réseau : impossible de contacter le serveur.');
      }
    };

    useEffect(() => {
      let picsDiv = []
      let picsTemp = []
      fetch('/api/gallery/pics/', requestOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setResult(result)
              },
              (error) => {
                console.log(error)
              }
            );
          fetch('/api/gallery/', requestOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setName(result.name)
              },
              (error) => {
                console.log(error)
              }
            );
    }, [])

    const ref = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null)
    const ref4 = useRef(null)

    useEffect(() => {
            const handleClickOutside = (event) => {
              if (ref.current && !ref.current.contains(event.target)
                && ref2.current && !ref2.current.contains(event.target)
                && ref3.current && !ref3.current.contains(event.target)
                && ref4.current && !ref4.current.contains(event.target)) {
                closeModal()
              }
            };
            document.addEventListener('click', handleClickOutside, true);
            return () => {
              document.removeEventListener('click', handleClickOutside, true);
            };
          },[]);

    return (
      <>
      <CustomNavbar/>
        <div className="introductive-content">
          <h2 className="gallery-title">{name}</h2>
          <ChecklistIcon className="select-toggle-icon" onClick={toggleSelectionMode}
            titleAccess={selectionMode ? 'Quitter le mode sélection' : 'Sélectionner des photos'}/>
        </div>
        {selectionMode && (
          <div className="selection-bar">
            <span>{selected.size} photo(s) sélectionnée(s)</span>
            <button type="button" className="login-button" onClick={downloadSelected}
              disabled={selected.size === 0}>
              Télécharger la sélection
            </button>
          </div>
        )}
        <PictureMosaic result={result} selectionMode={selectionMode}
          selected={selected} onToggleSelect={toggleSelect}/>
      </>


      );
    }
```

- [ ] **Step 4: Implémenter la transmission dans PictureMosaic.js**

Dans `react/src/components/PictureMosaic.js`, remplacer le `useEffect` qui construit `picsList` par :

```jsx
    useEffect(() => {
        const picsTemp = []
        const picsDiv = []
        for (const pic in props.result) {
            const file = props.result[pic]
            picsTemp.push(file.link + '/uploads/' + file.file_full_name)
            picsDiv.push(
                <Col key={pic} xs="4" sm="3" lg="2">
                    <GallerySticker img={file.link + '/uploads/' + file.file_full_name}
                        thumb={file.link + '/thumbnails/' + file.file_full_name}
                        modal_func={toggleModal}
                        selectionMode={props.selectionMode}
                        selected={props.selected && props.selected.has(file.file_full_name)}
                        onToggleSelect={props.onToggleSelect}
                        fileFullName={file.file_full_name} />
                </Col>
            )
        }
        setPicsList(picsDiv)
        setPics(picsTemp)
    }, [props.result, props.selectionMode, props.selected]);
```

(rien d'autre ne change dans ce fichier : sans `selectionMode`, `GallerySticker` se comporte exactement comme avant).

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `cd react && CI=true npm test -- Gallery`
Expected: PASS.

Run: `cd react && CI=true npm test -- PictureMosaic`
Expected: PASS — nouveaux tests de sélection ET tests existants (report dialog, fermeture du modal, flèches clavier).

- [ ] **Step 6: Commit**

```bash
git add react/src/components/Gallery.js react/src/components/Gallery.test.js react/src/components/PictureMosaic.js react/src/components/PictureMosaic.test.js
git commit -m "Galerie : sélection de plusieurs photos et téléchargement en zip"
```

---

### Task 5: Front — Gestion : mode sélection + téléchargement + suppression en masse

**Files:**
- Modify: `react/src/components/GestionGallery.js`
- Modify: `react/src/components/GestionGallery.test.js`

- [ ] **Step 1: Écrire les tests échouants**

Dans `react/src/components/GestionGallery.test.js` :

1. Remplacer le mock de `GallerySticker` en tête de fichier par :

```jsx
// Mock GallerySticker to inspect props passed to it
jest.mock('./GallerySticker', () => {
  return function MockGallerySticker(props) {
    return (
      <div
        data-testid="gallery-sticker"
        data-compact={props.compact ? 'true' : 'false'}
        data-selection-mode={props.selectionMode ? 'true' : 'false'}
        data-selected={props.selected ? 'true' : 'false'}
        data-img={props.img}
        data-thumb={props.thumb}
        onClick={(e) =>
          props.selectionMode
            ? props.onToggleSelect(props.fileFullName)
            : props.modal_func(e, props.img)
        }
      >
        sticker
      </div>
    );
  };
});
```

2. Ajouter juste après `mockGalleryResponse` :

```jsx
const mockReportsResponse = [
  {
    id: 1,
    file_full_name: 'photo1.jpg',
    reporter_name: 'student',
    category: 'autre',
    message: '',
    created_at: '2026-10-01T12:00:00Z',
  },
];
```

3. Remplacer la fonction `mockFetch()` par (seul changement : la branche `reports` avant la branche générique `/api/gallery/`) :

```jsx
function mockFetch() {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/gallery/pics/')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockPicsResponse),
      });
    }
    if (url.includes('/api/gallery/reports/')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockReportsResponse),
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
```

4. Ajouter à la fin du `describe('GestionGallery', ...)` :

```jsx
  // --- Sélection multiple (TODO : sélection de plusieurs photos) ---

  test('the select button toggles selection mode on stickers', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    const stickers = screen.getAllByTestId('gallery-sticker');
    expect(stickers[0].getAttribute('data-selection-mode')).toBe('false');

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    const stickersAfter = screen.getAllByTestId('gallery-sticker');
    expect(stickersAfter[0].getAttribute('data-selection-mode')).toBe('true');
    expect(screen.getByText('Télécharger la sélection')).toBeInTheDocument();
    expect(screen.getByText('Supprimer la sélection')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    const stickersNormal = screen.getAllByTestId('gallery-sticker');
    expect(stickersNormal[0].getAttribute('data-selection-mode')).toBe('false');
    expect(screen.queryByText('Télécharger la sélection')).not.toBeInTheDocument();
  });

  test('clicking stickers in selection mode selects them and updates the counter', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    expect(screen.getByText('0 photo(s) sélectionnée(s)')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
    await waitFor(() => {
      expect(screen.getByText('1 photo(s) sélectionnée(s)')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('gallery-sticker')[0].getAttribute('data-selected')).toBe('true');

    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
    await waitFor(() => {
      expect(screen.getByText('0 photo(s) sélectionnée(s)')).toBeInTheDocument();
    });
  });

  test('downloading the selection calls the download API with the selected names', async () => {
    URL.createObjectURL = jest.fn(() => 'blob:fake');
    URL.revokeObjectURL = jest.fn();

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[1]);
    await waitFor(() => {
      expect(screen.getByText('2 photo(s) sélectionnée(s)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Télécharger la sélection'));
    await waitFor(() => {
      const [url, options] = global.fetch.mock.calls.find(
        ([u]) => u === '/api/gallery/pics/download/'
      );
      expect(url).toBe('/api/gallery/pics/download/');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        slug: 'test-gallery',
        file_full_names: ['photo1.jpg', 'photo2.jpg'],
      });
    });
  });

  test('deleting the selection asks for confirmation and calls the delete API', async () => {
    window.confirm = jest.fn(() => true);
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: jest.fn() };

    try {
      render(<GestionGallery />);
      await waitFor(() => {
        expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
      });

      fireEvent.click(screen.getByTestId('ChecklistIcon'));
      fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
      fireEvent.click(screen.getAllByTestId('gallery-sticker')[1]);
      await waitFor(() => {
        expect(screen.getByText('2 photo(s) sélectionnée(s)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Supprimer la sélection'));
      expect(window.confirm).toHaveBeenCalledWith('Supprimer 2 photo(s) ?');
      await waitFor(() => {
        const [url, options] = global.fetch.mock.calls.find(
          ([u]) => u === '/api/gallery/pics/delete_many/'
        );
        expect(url).toBe('/api/gallery/pics/delete_many/');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({
          slug: 'test-gallery',
          file_full_names: ['photo1.jpg', 'photo2.jpg'],
        });
      });
      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    } finally {
      window.location = originalLocation;
    }
  });

  test('cancelling the confirmation does not call the delete API', async () => {
    window.confirm = jest.fn(() => false);

    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('ChecklistIcon'));
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
    fireEvent.click(screen.getByText('Supprimer la sélection'));
    expect(window.confirm).toHaveBeenCalled();
    expect(
      global.fetch.mock.calls.find(([u]) => u === '/api/gallery/pics/delete_many/')
    ).toBeUndefined();
  });
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd react && CI=true npm test -- GestionGallery`
Expected: FAIL — pas de `ChecklistIcon`, `data-selection-mode` reste `false`, les tests existants PASS toujours (le mock rétrocompatible garde `modal_func` hors mode sélection).

- [ ] **Step 3: Implémenter dans GestionGallery.js**

Dans `react/src/components/GestionGallery.js` :

1. Ajouter l'import après `import ZoomOutIcon ...` :

```jsx
import ChecklistIcon from '@mui/icons-material/Checklist';
```

2. Ajouter les états après `const [isCompact, setIsCompact] = useState(false);` :

```jsx
    // Mode sélection multiple
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
```

3. Ajouter après `toggleCompact` :

```jsx
    //Enter/leave the multi-selection mode; leaving clears the selection
    const toggleSelectionMode = () => {
      setSelectionMode(prev => !prev);
      setSelected(new Set());
    }

    //Add/remove one picture from the selection
    const toggleSelect = (fileFullName) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(fileFullName)) {
          next.delete(fileFullName);
        } else {
          next.add(fileFullName);
        }
        return next;
      });
    }

    //Download the selection as a single zip built by the backend
    const downloadSelected = async () => {
      if (selected.size === 0) return;
      const downloadOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, file_full_names: Array.from(selected) })
      };
      try {
        const response = await fetch('/api/gallery/pics/download/', downloadOptions);
        if (!response.ok) {
          alert('Impossible de télécharger les photos sélectionnées.');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = gallery_slug + '-selection.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.log(err);
        alert('Erreur réseau : impossible de contacter le serveur.');
      }
    }

    //Delete every selected picture after a confirmation
    const deleteSelected = () => {
      if (selected.size === 0) return;
      if (!window.confirm('Supprimer ' + selected.size + ' photo(s) ?')) return;
      const deleteOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, file_full_names: Array.from(selected) })
      };
      fetch('/api/gallery/pics/delete_many/', deleteOptions)
            .then(res => res.json())
            .then(
              (result) => {
                if (result.status === 'error') {
                  alert(result.message)
                  return
                }
                window.location.reload(false)
              },
              (error) => {
                console.log(error)
                alert('Impossible de supprimer les photos sélectionnées.')
              }
            );
    }
```

4. Dans la barre d'icônes du header, ajouter le bouton de sélection après le `FlagIcon` :

```jsx
              <FlagIcon onClick={loadReports} className="icon" titleAccess="Signalements"/>
              <ChecklistIcon className="icon" onClick={toggleSelectionMode}
                titleAccess={selectionMode ? 'Quitter le mode sélection' : 'Sélectionner des photos'}/>
```

5. Juste après la ligne `</Stack>` (toujours à l'intérieur de la `div.introductive-content`), ajouter la barre d'actions :

```jsx
        {selectionMode && (
          <div className="selection-bar">
            <span>{selected.size} photo(s) sélectionnée(s)</span>
            <button type="button" className="login-button" onClick={downloadSelected}
              disabled={selected.size === 0}>
              Télécharger la sélection
            </button>
            <button type="button" className="login-button" onClick={deleteSelected}
              disabled={selected.size === 0}>
              Supprimer la sélection
            </button>
          </div>
        )}
```

6. Dans la `<Row>`, transmettre les props de sélection à `GallerySticker` :

```jsx
            {picsData.map((pic, index) => (
              <Col key={index} xs={isCompact ? "3" : "4"} sm={isCompact ? "2" : "3"} lg={isCompact ? "1" : "2"}>
                <GallerySticker img={pic.link + '/uploads/' + pic.file_full_name}
                                thumb={pic.link + '/thumbnails/' + pic.file_full_name}
                                modal_func={toggleModal}
                                compact={isCompact}
                                selectionMode={selectionMode}
                                selected={selected.has(pic.file_full_name)}
                                onToggleSelect={toggleSelect}
                                fileFullName={pic.file_full_name}/>
              </Col>
            ))}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd react && CI=true npm test -- GestionGallery`
Expected: PASS — nouveaux tests de sélection/suppression ET tous les tests existants (upload, zoom compact, modal).

- [ ] **Step 5: Commit**

```bash
git add react/src/components/GestionGallery.js react/src/components/GestionGallery.test.js
git commit -m "Gestion : sélection de plusieurs photos, téléchargement et suppression en masse"
```

---

### Task 6: Front — Gestion : le drapeau filtre les photos signalées (toggle)

**Files:**
- Modify: `react/src/components/GestionGallery.js`
- Modify: `react/src/components/GestionGallery.test.js`

- [ ] **Step 1: Écrire les tests échouants**

Ajouter à la fin du `describe('GestionGallery', ...)` dans `react/src/components/GestionGallery.test.js` (après les tests de sélection — le mock de `/api/gallery/reports/` et `mockReportsResponse` ont été posés à la Task 5) :

```jsx
  // --- Filtre photos signalées (drapeau) ---

  test('the flag shows only the reported pictures', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('FlagIcon'));
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(1);
    });
    expect(screen.getAllByTestId('gallery-sticker')[0].getAttribute('data-img'))
      .toBe('/media/test-gallery/uploads/photo1.jpg');
    // Le bouton de détails des signalements n'apparaît qu'en mode filtré
    expect(screen.getByTestId('ListIcon')).toBeInTheDocument();
  });

  test('clicking the flag again returns to the normal view', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('FlagIcon'));
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(1);
    });

    fireEvent.click(screen.getByTestId('FlagIcon'));
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });
    expect(screen.queryByTestId('ListIcon')).not.toBeInTheDocument();
  });

  test('the flag fetches the reports from the API with the gallery slug', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('FlagIcon'));
    await waitFor(() => {
      const [url, options] = global.fetch.mock.calls.find(
        ([u]) => u === '/api/gallery/reports/'
      );
      expect(url).toBe('/api/gallery/reports/');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ slug: 'test-gallery' });
    });
  });

  test('the details button opens the reports modal', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('FlagIcon'));
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(1);
    });

    fireEvent.click(screen.getByTestId('ListIcon'));
    await waitFor(() => {
      expect(screen.getByText('Signalements')).toBeInTheDocument();
      expect(screen.getByText(/signalée par/)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd react && CI=true npm test -- GestionGallery`
Expected: FAIL — le clic sur `FlagIcon` ouvre le modal des signalements au lieu de filtrer, aucun `ListIcon`.

- [ ] **Step 3: Implémenter dans GestionGallery.js**

1. Ajouter l'import après `import ChecklistIcon ...` :

```jsx
import ListIcon from '@mui/icons-material/List';
```

2. Ajouter les états après les états de sélection :

```jsx
    // Filtre « photos signalées » : null = mode normal
    const [reportsOnly, setReportsOnly] = useState(false);
    const [reportedNames, setReportedNames] = useState(new Set());
```

3. Ajouter la fonction `toggleReportsOnly` après `loadReports` :

```jsx
    // The flag is a toggle: only reported pictures, then back to normal
    const toggleReportsOnly = () => {
      if (reportsOnly) {
        setReportsOnly(false)
        return
      }
      const reportOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug })
      };
      fetch('/api/gallery/reports/', reportOptions)
            .then(res => {
              if (!res.ok) {
                alert("Impossible de charger les signalements.")
                return null
              }
              return res.json()
            })
            .then(
              (result) => {
                if (Array.isArray(result)) {
                  setReportedNames(new Set(result.map(r => r.file_full_name)))
                  setReportsOnly(true)
                }
              },
              (error) => {
                console.log(error)
              }
            );
    }
```

4. Dans la barre d'icônes du header, remplacer la ligne du `FlagIcon` et ajouter le bouton de détails :

```jsx
              <FlagIcon onClick={toggleReportsOnly}
                className={'icon' + (reportsOnly ? ' icon-active' : '')}
                titleAccess={reportsOnly ? 'Afficher toutes les photos' : 'Photos signalées'}/>
              {reportsOnly && (
                <ListIcon className="icon" onClick={loadReports} titleAccess="Détails des signalements"/>
              )}
              <ChecklistIcon className="icon" onClick={toggleSelectionMode}
                titleAccess={selectionMode ? 'Quitter le mode sélection' : 'Sélectionner des photos'}/>
```

5. Filtrer la liste affichée : ajouter juste avant le `return (` :

```jsx
    const displayedPics = reportsOnly
      ? picsData.filter(pic => reportedNames.has(pic.file_full_name))
      : picsData;
```

et dans la `<Row>`, remplacer `{picsData.map((pic, index) => (` par :

```jsx
            {displayedPics.map((pic, index) => (
```

(le reste du bloc `GallerySticker` posé à la Task 5 est inchangé).

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd react && CI=true npm test -- GestionGallery`
Expected: PASS — les 4 nouveaux tests du filtre ET tous les tests précédents.

- [ ] **Step 5: Commit**

```bash
git add react/src/components/GestionGallery.js react/src/components/GestionGallery.test.js
git commit -m "Gestion : le drapeau filtre les photos signalées, re-clic pour revenir au mode normal"
```

---

### Task 7: Vérification complète + mise à jour du TODO

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Suite backend complète**

Run: `docker compose exec back python manage.py test -v 2`
Expected: PASS — toutes les apps de `back/test/` (dont les nouvelles `test_selection.py`), aucune régression sur `test_api`, `test_reports`, `test_views`, `test_models`.

- [ ] **Step 2: Suite frontend complète**

Run: `cd react && CI=true npm test -- --watchAll=false`
Expected: PASS — tous les fichiers de test (Gallery, GallerySticker, GestionGallery, PictureMosaic, ReportDialog, ReportList, GallerySticker, App).

- [ ] **Step 3: Vérification manuelle (E2E light)**

Avec Docker up, ouvrir `http://localhost/gallery/<slug d'une galerie publique>` :
1. Bouton « Sélectionner » (icône liste cochée) → cliquer 2-3 vignettes → « Télécharger la sélection » → un zip arrive avec les bonnes photos.
2. Re-cliquer « Sélectionner » → la sélection est vidée.
3. Sur `http://localhost/gestion/gallery/<slug>` : idem + « Supprimer la sélection » → confirmation → les photos disparaissent au rechargement.
4. En gestion : cliquer le drapeau → seules les photos signalées s'affichent, icône en bleu ; « Détails des signalements » ouvre l'ancien modal ; re-cliquer le drapeau → toutes les photos reviennent.

- [ ] **Step 4: Mettre à jour TODO.md**

Supprimer la ligne accomplie du `TODO.md` :

```
- Pouvoir sélectionner plusieurs photos, du côtés galeries pour en télécharger plusieurs, du côté gestion pour en supprimer plusieurs d'un coup. 
```

- [ ] **Step 5: Commit**

```bash
git add TODO.md
git commit -m "Sélection multiple : retrait de la ligne du TODO accomplie"
```

---

## Self-Review

**Couverture du besoin :**
- « en galerie et en gestion on puisse sélectionner plusieurs photos d'un coup » → Tasks 3, 4, 5 (bouton Sélectionner, clic sur vignettes, mode toggle).
- « sur galerie on puisse télécharger les photos sélectionnées » → Task 1 (endpoint zip) + Task 4 (bouton + blob download).
- « sur gestion on puisse en plus les supprimer » → Task 2 (endpoint bulk delete) + Task 5 (télécharger + supprimer en gestion).
- « en gestion, cliquer sur le drapeau n'affiche que les photos signalées, re-cliquer revient au mode normal » → Task 6 (toggle + filtre).

**Limitations connues et assumées (à dire à l'utilisateur) :**
- `delete_many` ne supprime que les lignes en base, comme `delete_pic` existant : les fichiers restent sur le disque (TODO déjà présent dans le code sur la suppression unitaire).
- Le zip est construit en mémoire : pour des sélections de plusieurs centaines de photos très lourdes, le pic mémoire backend sera significatif ; acceptable pour l'usage du club, à surveiller.
- Le filtre signalements s'appuie sur la liste des signalements actifs : une photo dont tous les signalements seraient supprimés/supprimés en cascade ne s'affiche plus dans le filtre (comportement attendu).

---

## Résultats d'exécution et revue finale — FAIT (7/7 tâches)

Exécution en subagent-driven (implémenteur dédié par tâche + double revue spec/qualité par tâche + revue finale de branche), dans le worktree `~/.config/superpowers/worktrees/ponthe-website/selection-multiple-photos` (branche `feature/selection-multiple-photos`, base `43b2636`). La branche a ensuite été fusionnée en fast-forward dans `master` (`43a57a5`).

### Commits par tâche

| Tâche | Commit | Contenu |
|---|---|---|
| 1. API téléchargement zip | `48722b9` | `download_pics` + route `gallery/pics/download/` + `back/test/test_selection.py` (7 tests) |
| 2. API suppression en masse | `9e0f868` + `f2e29b3` | `delete_pics` + route `gallery/pics/delete_many/` ; retour de revue : `deleted` ne compte que les photos (pas les `Report` en cascade), formatage black/isort, 2 tests de contrat en plus |
| 3. GallerySticker sélectionnable | `c2d3a60` | props `selectionMode`/`selected`/`onToggleSelect`/`fileFullName` rétrocompatibles, styles App.css. Déviation du plan justifiée : icône enveloppée dans un `<span>` (className d'un svg MUI est un SVGAnimatedString en jsdom) |
| 4. Galerie publique | `44d8168` | bouton Sélectionner, barre de sélection, `downloadSelected` (blob), transmission via `PictureMosaic` ; retour de revue : `titleAccess` sur la coche |
| 5. Gestion | `872cc29` | idem + `deleteSelected` avec confirmation ; retour de revue : `aria-live` sur le compteur |
| 6. Filtre drapeau | `95f9cce` | toggle photos signalées, icône active, bouton « Détails des signalements » (l'ancien modal est conservé derrière lui) |
| 7. TODO | `43a57a5` | retrait de la ligne accomplie |

### Vérifications (exécutées, pas seulement déclarées)

| Vérification | Résultat |
|---|---|
| Suite backend (Docker, conteneur dédié au worktree) | 94/94 OK (79 baseline + 15 nouveaux) |
| Suite frontend (Jest) | 72 passés ; seul `App.test.js` échoue — échec **préexistant sur master** (boilerplate CRA « learn react »), baseline identique |
| E2E endpoint zip (stack isolée, galerie publique + 2 photos factices) | HTTP 200, `application/zip`, zip contenant exactement les 2 photos sélectionnées ; données nettoyées ensuite |
| black 26.10.0 + isort 9.0.2 (versions CI) sur nos fichiers | clean |
| Périmètre de chaque commit | `git show --stat` vérifié par le contrôleur : uniquement les fichiers de sa tâche |
| Après fusion sur `master` (stack principale) | backend 94/94 OK ; `webinstaller` (webpack --watch) recompilé ; `gallery/pics/download` présent dans `gallery.bundle.js` et `gestiongallery.bundle.js` servis ; `POST /api/gallery/pics/download/` répond en live avec le JSON de la nouvelle vue |

### Revue finale de la branche (diff 43b2636..43a57a5)

- Les 4 points de la demande sont couverts : sélection multiple (galerie + gestion), téléchargement en galerie, téléchargement + suppression en gestion, drapeau = filtre toggle des photos signalées.
- Contrats frontend↔backend alignés (`{slug, file_full_names}` des deux côtés, nom du zip `{slug}-selection.zip` cohérent) ; aucune régression : modal/zoom/upload/signalements intacts, seules migrations de tests nécessaires (3 tests du modal signalements vers le nouveau parcours, 2 assertions `/sélectionn/i` resserrées) — fidèles et validées en revue spec.
- Aucune migration Django (aucun modèle modifié).

### Points d'attention (non bloquants)

1. En vue filtrée, les flèches du modal parcourent encore toutes les photos de la galerie (`pics` non filtré).
2. La sélection survit au basculement du filtre : le compteur peut inclure des photos non affichées (les actions agissent sur le `Set`, la suppression a une confirmation chiffrée).
3. Un 403 DRF sur `delete_many` (session expirée) recharge silencieusement au lieu d'alerter (page déjà réservée aux gestionnaires).
4. La suppression en masse ne supprime que les lignes en base : les fichiers restent sur disque (TODO disque préexistant) — un re-import les recréerait.
5. Le job lint de la CI (`black . --check`) échoue sur des fichiers **préexistants de master** (`api/views.py` ~397, migrations, `gestion/views.py`, `test_reports.py`…) — indépendant de cette branche.

**Verdict : FUSIONNÉ DANS MASTER — READY TO PUSH.**
