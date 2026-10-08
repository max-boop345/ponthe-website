# Audit sécurité — Ponthé (fork max-boop345)

Audit réalisé sur le code de la branche `master` (`2848fdd`) + refonte visuelle (`feature/design-refresh`) par revue de code complète (backend, front, nginx, Docker, templates). Le SSO/CAS est hors périmètre, comme demandé. Chaque finding a été vérifié par lecture du code ; les « non-problèmes » vérifiés négativement sont listés en fin de rapport.

**Verdict global : aucun point critique en production avec `DEBUG=False` correctement posé.** Le socle est sain : règles d'accès centralisées (`can_user_access`, `is_manager`), CSRF couvert, aucun XSS trouvé, aucun secret commis.

---

## ÉLEVÉ

### E1. Chaîne `DEBUG=True` : parsing fragile + contournement total de l'authentification média en mode DEBUG
- **Fichiers** : `back/galerie/settings.py:23-37`, `.env.example:13`, `back/galerie/urls.py:50-52`
- **Analyse** :
  1. Le parsing est un match exact sur la chaîne `"False"` (`settings.py:23`). Toute autre valeur « fausse » (`0`, `false`, `no`, `FALSE`) active `DEBUG = True`.
  2. En mode DEBUG : `ALLOWED_HOSTS = ["*"]` et `SECRET_KEY` hardcodée et publique dans le repo (`settings.py:37`) → forge de cookies de session par quiconque a lu le code source.
  3. **Le plus grave** : `back/galerie/urls.py:50` — en DEBUG, les médias sont servis par le helper `static()`, **sans passer par la vue d'authentification `media()`**. Un site démloyé avec `DEBUG != "False"` expose toute l'arborescence `/media/` — galeries privées comprises — en accès anonyme, plus les stack traces et le panneau de debug.
- **Scénario** : l'opérateur déploie avec `DEBUG=0` dans le `.env`. Un étudiant tape `https://ponthe.enpc.fr/media/<galerie-privée>/uploads/…` et télécharge les photos sans session.
- **Correctif** :
  1. `DEBUG = os.getenv("DEBUG", "False").strip().lower() in ("1", "true", "yes")`
  2. Ne jamais brancher le service média sur `DEBUG` — toujours servir `/media/` via `views.media()` ; réserver le helper `static()` à `runserver`.
  3. Fail-fast : lever une exception au démarrage si `DEBUG` est vrai avec le target Docker `production`.

---

## MOYEN

### M1. Zip bomb : extraction illimitée et synchrone dans la requête
- **Fichiers** : `back/galerie/loader.py:51-53` (`extractall` sans plafond), `back/gestion/views.py:49-70`
- **Analyse** : la taille est plafonnée à 500 Mo **compressés**, mais l'extraction (synchrone, dans la requête) n'a aucun plafond : un zip deflate de 500 Mo peut décompresser des centaines de Go sur le disque de l'hôte (`./back/media`), faisant tomber PostgreSQL et le site. La protection path-traversal de `extractall` (Python ≥3.6) est correcte ; seul le volume n'est pas borné.
- **Scénario** : archive corrompue ou malveillante uploadée par un compte gestionnaire → disque plein → site et base indisponibles.
- **Correctif** : extraction manuelle avec plafond — sommer `zinfo.file_size` avant extraction, rejeter au-delà d'~1 Go ou si un membre dépasse N Mo ; idéalement extraction en flux avec compteur d'octets.

### M2. nginx : `location /api/*` ne matche jamais — la limite 3 Mo est inopérante
- **Fichier** : `nginx/nginx.conf:28` vs `:13`
- **Analyse** : `location /api/*` est un préfixe **littéral** (l'astérisque n'est pas un joker nginx). Aucune URI réelle ne commence par `/api/*` : toutes les requêtes API tombent dans `location /` avec `client_max_body_size 2G`. Les `proxy_buffers` du bloc sont également morts.
- **Scénario** : `POST /api/gallery/pics/download/` accepte un corps JSON jusqu'à 2 Go ; `file_full_names` est une liste non plafonnée → clause `IN` géante côté PostgreSQL + pic mémoire du zip.
- **Correctif** : `location /api/ { … }` (sans `/*`) ; côté Django, plafonner `len(names)` (p. ex. 500).

### M3. `/admin/login/` sans limitation de débit
- **Fichiers** : `back/galerie/urls.py:31`, `back/galerie/views.py:26-66`
- **Analyse** : le throttle maison ne couvre que `/login/`. Le login du Django admin — comptes staff/superuser qui contrôlent toutes les galeries privées — n'a aucune limite, et nginx ne fait aucun `limit_req`.
- **Scénario** : brute-force parallèle et silencieux sur `/admin/login/`.
- **Correctif** : `limit_req` nginx sur `location /admin/`, ou middleware de throttle réutilisable.

### M4. `media()` : l'anti-traversal repose uniquement sur la normalisation nginx
- **Fichiers** : `back/galerie/views.py:82-105`, `nginx/nginx.conf:24-26`
- **Analyse** : la vue vérifie le premier segment de chemin contre les slugs puis renvoie `X-Accel-Redirect` **sans rejeter les segments `..`**. Aujourd'hui bloqué par deux propriétés implicites des nginx (normalisation des dot-segments, y compris `%2e%2e` ; ré-encodage par `quote()`) — une défense à couche unique, invisible côté Django : toute migration de reverse-proxy (Traefik, Caddy…) ou retouche nginx rouvrirait un accès vers n'importe quelle galerie, privée incluse.
- **Correctif** : validation explicite dans `media()` — rejeter tout segment `""`, `.` ou `..` (ou `os.path.normpath` + vérification de préfixe sous `MEDIA_ROOT/<slug>`), garder `quote()` en second rideau, ajouter un test.

---

## FAIBLE

### F1. Verrouillage de compte ciblé via le limiteur de login
- `back/galerie/views.py:26-66` — le compteur est par compte : 10 mots de passe erronés sur le login d'un admin bloquent son accès par mot de passe 15 min, en boucle (DoS ciblé gratuit ; le SSO n'est pas affecté). **Correctif** : compteur parallèle par IP + délais progressifs ; ne compter que les échecs sur des comptes existants.

### F2. `report_pic` : pas de plafond global
- `back/api/views.py:361-410` — un utilisateur peut signaler **chaque photo** d'une galerie une fois → des centaines de signalements par compte, sans cap (l'injection est impossible : messages rendus en JSX React échappé). **Correctif** : cap par utilisateur (p. ex. 10/24 h).

### F3. `download_pics` : un `File` forgé via l'admin Django peut traverser l'arborescence
- **Fichiers** : `back/api/views.py:315-321`, `back/api/admin.py`
- **Analyse** : les `file_full_names` de la requête ne servent qu'au filtre DB, et les lignes sont normalement écrites par `loader.py` (`os.listdir` → jamais de `/`). Mais le `FileAdmin` permet de saisir un `file_full_name` libre (`../../galerie/settings.py`), et `download_pics` le téléchargerait — élévation faible (manager-only) mais réelle. **Correctif** : rejeter tout `file_full_name` contenant `/` ou `..` dans `download_pics` ; idéalement valider le format dans `File.clean()`.

### F4. Upload gestion : type vérifié par extension, taille vérifiée après réception complète
- **Fichiers** : `back/gestion/views.py:41-53`
- **Analyse** : le contrôle de taille intervient après bufferisation complète du corps par nginx (2G, cf. M2) et gunicorn. L'extension ne prouve rien (`BadZipFile` est géré ; `FileSystemStorage.save` protège du traversal ; le fichier temporaire est supprimé en `finally`). **Correctif** : `client_max_body_size` ~500 Mo sur `/gestion/` côté nginx ; vérifier les magic bytes `PK\x03\x04`.

### F5. Robustesse des routes gestion : quelques 500 non gérés
- **Fichiers** : `back/api/views.py:277,286` (`Gallery.objects.get(name=…)` → 500 sur galerie inconnue), `:174-172` (galerie sauvée en base avant `os.mkdir` : galerie zombie si l'OS refuse ; `IntegrityError` concurrent non attrapée → 500). **Correctif** : `filter(...).first()` + 404 partout (pattern déjà utilisé ailleurs dans le fichier) ; créer les dossiers avant `serializer.save()`.

---

## Points vérifiés — non-problèmes

| # | Point | Verdict |
|---|---|---|
| N1 | **CSRF** | Conforme. `SessionAuthentication` (requêtes authentifiées) + `CsrfViewMiddleware` (vues Django). Les routes POST `AllowAny` anonymes (`get_gallery`, `get_pics`, `download_pics`) ne font que des lectures ; `report_pic` refuse l'anonyme avant toute écriture. Le front envoie `X-CSRFToken` partout. |
| N2 | **XSS** | Aucun `\|safe`, `mark_safe`, `autoescape off` ; `gallery_slug = '{{slug}}'` sûr (convertisseur `<slug:slug>` + autoescape Django) ; front React : zéro `dangerouslySetInnerHTML`/`innerHTML`/`eval` (grep négatif) — JSX échappe par défaut. |
| N3 | **`media()` vs `can_user_access`** | Conforme en prod : publique = anonymes, école = tout authentifié, privée = gestionnaires. Le seul écart est E1 (mode DEBUG). |
| N4 | **Routing `/media` nginx** | Conforme : `location /protected/ { internal; alias /src/media/; }` — accessible uniquement via `X-Accel-Redirect`. |
| N5 | **Content-Disposition `{slug}`** | Non exploitable : le slug vient exclusivement de `slugify(name)` (sortie `[a-z0-9-]`) ou du `SlugField` admin validé ; aucune migration ne backfille des slugs bruts. |
| N6 | **Path traversal piloté par la requête dans `download_pics`** | Non exploitable : le chemin est construit depuis la ligne DB (écrite par `loader.py` via `os.listdir`), pas depuis la requête. Reste F3 (admin forgé). |
| N7 | **Secrets** | Seul `.env.example` est suivi par git (placeholders `change-me`). `database/` non suivi. Postgres non publié sur l'hôte, `scram-sha-256` en réseau. La SECRET_KEY publique n'est active qu'en DEBUG (cf. E1). |
| N8 | **Headers nginx** | Manquants (nosniff, CSP, HSTS sur /static et /media) — sans exploit direct aujourd'hui (aucun upload HTML/JS utilisateur), à porter sur le nginx hôte en durcissement. |
| N9 | **Précédence des `Q`** dans `get_galleries`/`get_expositions` (`views.py:107,125`) | Incohérence d'affichage (galeries « école » apparaissent dans les deux listes), pas une fuite — même règle d'accès des deux côtés. |
| N10 | **Divers** | `ALLOWED_HOSTS=["*"]` seulement en DEBUG ; pas de middleware CORS (same-origin) ; `/admin/` exposé acceptable sous réserve de M3 ; `print()` de debug dans `galerie/views.py:97,178`. |

---

## Priorités de correction

1. **E1** (parsing DEBUG + jamais servir `/media/` hors de `views.media()`) — seule finding qui, à elle seule, expose toutes les galeries privées.
2. **M2** (nginx `location /api/`) — one-liner qui restaure la limite 3 Mo.
3. **M4** (validation `..` dans `media()`), **M1** (plafond d'extraction zip), **M3** (rate-limit `/admin/`).
4. Durcissement : F1–F5 (quelques lignes chacun).

Tous les correctifs tiennent en ~50 lignes au total. Les scénarios sont dérivés du code et de la sémantique documentée de nginx/gunicorn/zipfile ; aucun vecteur d'attaque n'a été exécuté contre un serveur en fonctionnement (audit en lecture seule).
