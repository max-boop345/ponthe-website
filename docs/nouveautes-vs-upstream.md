# Nouveautés du fork vs upstream — résumé et notes de déploiement

Comparaison : fork `max-boop345/ponthe-website` (branche `master`, `2848fdd`) contre l'upstream `KIClubinfo/ponthe-website` (base `b2e7613`, « Gestion : un seul rôle, le même pour les pages et pour l'API »).

**37 commits d'avance, 0 en retard.** Aucun changement d'infrastructure de déploiement (settings, urls racine, nginx, docker-compose, entrypoints, `.env.example`, `pyproject.toml`, `package.json` : identiques à l'upstream) — aucune nouvelle variable d'environnement, aucune nouvelle dépendance Python ou npm.

---

## 1. Nouvelles fonctionnalités (fusionnées dans `master`)

### 1.1 Vue dézoomée en gestion
- Bouton zoom (icônes `ZoomIn`/`ZoomOut`) dans la barre d'outils de la page gestion : vignettes compactes de 80px au lieu de 170px, pour voir plus de photos d'un coup.
- Côté galerie publique : rien ne change.
- Composant : `GallerySticker` reçoit une prop `compact` ; styles dans `App.css` ; 15 tests.

### 1.2 Messages d'erreur d'upload en gestion
- L'upload d'un zip affiche désormais des erreurs claires dans le modal (fichier vide, mauvaise extension, pas un zip valide, trop gros (>500 Mo), galerie inconnue, erreur réseau) au lieu d'un échec silencieux.
- Backend (`back/gestion/views.py`) : réponses JSON `{status, message}` pour les requêtes AJAX (`X-Requested-With`), fallback HTML rétrocompatible pour les requêtes normales ; validations : extension `.zip`, taille ≤ 500 Mo, fichier non vide, zip réellement lisible.
- Le message d'erreur s'efface à la réouverture du modal ; le bouton est désactivé pendant l'envoi.

### 1.3 Signalement de photos
- Un utilisateur **connecté** peut signaler une photo depuis la galerie publique : bouton drapeau dans le modal photo → formulaire (motif : inapproprié / hors sujet / qualité / autre + message optionnel ≤ 1000 caractères).
- Un seul signalement par utilisateur et par photo (contrainte SQL) ; les anonymes n'ont pas le bouton.
- Côté gestion : le drapeau de la barre d'outils **filttre l'affichage sur les photos signalées uniquement** (re-clic = retour au mode normal, icône active en bleu) ; un bouton « Détails des signalements » (visible uniquement en mode filtré) ouvre le modal listant qui a signalé quoi, quand et pourquoi.
- Backend : modèle `Report` (migration `0011_report`), routes `POST /api/gallery/pics/report/` (utilisateurs connectés pouvant voir la galerie) et `POST /api/gallery/reports/` (gestionnaires).
- Contrôle d'accès : même règle que partout (`can_user_access`) ; `IsManager` pour la consultation gestion.

### 1.4 Sélection multiple (téléchargement et suppression en masse)
- Comme l'app Photos iOS : bouton « Sélectionner » (icône liste cochée) → clic sur les vignettes pour les sélectionner/désélectionner (contour bleu + coche).
- **Galerie publique** : barre de compteur + « Télécharger la sélection » → un zip contenant exactement les photos choisies (généré par le backend).
- **Gestion** : idem + « Supprimer la sélection » avec confirmation (`Supprimer N photo(s) ?`).
- Quitter le mode sélection vide la sélection ; le compteur est annoncé aux lecteurs d'écran (`aria-live`) ; les vignettes cochables portent `titleAccess`.
- Backend : deux nouvelles routes (voir §2) ; le zip est construit en mémoire ; la suppression en masse ne supprime que les lignes en base (les fichiers disque restent — comportement identique à la suppression unitaire existante).

---

## 2. Changements backend détaillés

| Fichier | Changement |
|---|---|
| `back/api/models.py` | Nouveau modèle `Report` (file, reporter, catégorie, message, date ; contrainte d'unicité utilisateur×photo) |
| `back/api/migrations/0011_report.py` | Migration de la table `report` (appliquée automatiquement par l'entrypoint au démarrage) |
| `back/api/views.py` | 4 nouvelles vues : `report_pic`, `gallery_reports`, `download_pics` (zip), `delete_pics` (masse) |
| `back/api/urls.py` | 4 nouvelles routes : `gallery/pics/report/`, `gallery/reports/`, `gallery/pics/download/`, `gallery/pics/delete_many/` |
| `back/api/serializers.py` | `ReportSerializer` (nom du fichier, du signaleur, motif, message, date) |
| `back/gestion/views.py` | Réponses JSON d'erreur d'upload + validations (type, taille, contenu du zip) |

**Nouvelles routes API :**

| Route | Méthode | Accès | Usage |
|---|---|---|---|
| `/api/gallery/pics/report/` | POST | Tout utilisateur connecté pouvant voir la galerie | Signaler une photo |
| `/api/gallery/reports/` | POST | Gestionnaires uniquement | Lister les signalements d'une galerie |
| `/api/gallery/pics/download/` | POST | Quiconque peut voir la galerie (anonyme si galerie publique) | Zip des photos sélectionnées |
| `/api/gallery/pics/delete_many/` | POST | Gestionnaires uniquement | Supprimer plusieurs photos |

**Tests** : 94 tests backend (79 à la base + 15 nouveaux : signalements, zip, suppression en masse), 87 tests frontend (dont 1 échec préexistant hérité de l'upstream, `App.test.js`, boilerplate CRA sans rapport).

---

## 3. Branche en attente : refonte visuelle « Affiche Pervenche »

La branche `feature/design-refresh` (poussée sur le fork, **non fusionnée**) redessine l'accueil et la page galeries : bandeau pervenche arrondi « GALRIES » avec pills d'année, cartes affiche arrondies, hero plein écran « PONTHÉ » à outline jaune, section équipe en cartes, tokens CSS (`--ponthe-*`), Inter en typo de base. Voir `docs/superpowers/plans/2026-10-08-design-refresh.md`.

---

## 4. Lancer le site sur le serveur — points de vigilance backend

Le déploiement suit la procédure habituelle de l'upstream (`scripts/build.sh` puis `scripts/start.sh`, ou `docker compose -f docker-compose-prod.yaml up -d --build`) : le code backend est cuit dans l'image (`target: production`), les migrations et `collectstatic` sont lancés par l'entrypoint, le `webinstaller` reconstruit les bundles React. **Aucune variable d'environnement nouvelle** par rapport à l'upstream.

Points à vérifier avant/après le lancement :

1. **`DEBUG=False` exactement dans le `.env` du serveur (CRITIQUE).** Le parsing (`settings.py`) ne reconnaît que la chaîne `"False"` : `DEBUG=0`, `DEBUG=false` ou `DEBUG=no` laissent le site en mode DEBUG. En mode DEBUG, `/media/` est servi **sans authentification** (galeries privées incluses), `ALLOWED_HOSTS=["*"]`, et la `SECRET_KEY` publique du repo est utilisée. Correctif recommandé avant mise en prod : parser les valeurs fausses courantes et ne jamais brancher le service média sur DEBUG.
2. **Migration `0011_report`** : appliquée automatiquement au démarrage du conteneur `back` ; prévoir la fenêtre de migration (quelques secondes, une seule table créée).
3. **Zip en mémoire** : `/api/gallery/pics/download/` construit le zip dans la RAM du worker gunicorn. Des sélections très lourdes (centaines de photos) ou simultanées peuvent faire monter la mémoire — prévoir des workers suffisamment dimensionnés (`GUNICORN_NB_WORKERS`) ; l'usage normal du club (dizaines de photos) est sans risque.
4. **Rebuild de l'image obligatoire** : le code est cuit dans l'image Docker (pas de montage en prod) — un simple `docker compose up -d` sans `--build` ne déploie PAS les nouveautés.
5. **Rebuild du front automatique** : le service `webinstaller` recompile les bundles au `up` (le `back` attend sa complétion) ; pas d'opération manuelle supplémentaire.
6. **Suppression = lignes en base uniquement** : les fichiers restent sur le disque (comportement hérité de l'upstream, TODO existant) ; un re-import du même dossier recréerait les photos. À communiquer aux gestionnaires.
7. **Problèmes préexistants hérités de l'upstream** (audit sécurité complet disponible sur demande) : `location /api/*` dans `nginx/nginx.conf` ne matche jamais (limite 3 Mo inopérante, corps jusqu'à 2 Go) ; `/admin/login/` sans limitation de débit ; anti-traversal de `media()` dépendant uniquement de la normalisation nginx ; extraction de zip non plafonnée (zip bomb possible par un gestionnaire). Tous corrigeables en quelques lignes chacun.

**Résumé : rien ne bloque un lancement serveur.** Le point 1 est le seul à traiter impérativement (une ligne de `.env` au minimum), les autres sont des vigilances ou du durcissement.
