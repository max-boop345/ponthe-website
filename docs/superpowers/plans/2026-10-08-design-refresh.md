# Design Refresh « Affiche Pervenche » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le site plus beau en polissant l'identité existante (pervenche `#8193F2` + jaune `rgb(255 196 37)` + Inter + fond blanc), en appliquant deux designs validés sur le canvas Superdesign : la page Galeries « Affiche arrondie » (bandeau pervenche, pills d'année, cartes affiche arrondies) et l'accueil « Hero osé sans voile » (hero photo plein écran, titre affiche à outline jaune, pills solides, section équipe en cartes).

**Architecture:** Front uniquement — aucun changement backend, aucune migration. Les couleurs/typo passent en variables CSS (`:root` dans `App.css`), les composants React `Galleries.js`, `GalleryLink.js`, `GalleryMosaic.js` et `HomePage.js` sont retravaillés pour suivre les drafts, et tout le style vit toujours dans `react/src/App.css` (convention du repo : un seul fichier CSS global + Bootstrap grid). Le sélecteur MUI `Select` de la page galeries est remplacé par des pills HTML (changement de composant testable). La navbar n'est PAS touchée : le logo Ponthé reste le lien vers l'accueil, fond pervenche conservé.

**Tech Stack:** React 18 (CRA), react-bootstrap (Row/Col), MUI icons (uniquement le chevron de scroll), vanilla CSS dans `App.css`, police Inter (déjà chargée par `back/galerie/templates/head.html`). Tests : Jest + React Testing Library.

---

## Contexte pour l'ingénieur (zéro contexte requis)

### Où tu travailles
- Worktree : `/Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh` — branche `feature/design-refresh` (base `2848fdd`, master à jour).
- La stack Docker principale (port 8000) sert le **checkout principal**, pas ce worktree ; ce plan est 100 % frontend : tous les tests sont Jest, aucun test backend n'est requis.
- Installation une seule fois : `cd <worktree>/react && npm install`.
- Tests : `cd <worktree>/react && CI=true npm test -- <NomFichier>` (par fichier) ou `CI=true npm test -- --watchAll=false` (tout). À la baseline, SEUL `src/App.test.js` échoue (boilerplate CRA « learn react », préexistant sur master, sans rapport — ne pas le réparer ici).

### Les designs validés (source de vérité visuelle)
Projet Superdesign « Ponthé — Design Refresh » :
- Galeries « Affiche arrondie » : draft `fde67747` — https://p.superdesign.dev/draft/fde67747-2a4e-40a9-8dc5-36028048f539
- Accueil « Hero osé sans voile » : draft `6376c5fd` — https://p.superdesign.dev/draft/6376c5fd-f0a4-4ae5-af47-575611cf7275
- Les specs extraites des drafts sont retranscrites intégralement dans les tâches ci-dessous (tu n'as pas besoin d'ouvrir les drafts pour implémenter).

### État actuel des fichiers concernés
- `react/src/components/Galleries.js` : fetch `/api/get_view?view=...` + `/api/years`, état `year`, rend un `<Select>` MUI (menu des années) puis `<GalleryMosaic result year/>`. Sert `/galleries/` ET `/expositions/` (props `view` = `galerie`/`exposition`).
- `react/src/components/GalleryMosaic.js` : filtre par année, rend `<Row className="g-1">` de `<GalleryLink/>`.
- `react/src/components/GalleryLink.js` : carte actuelle = photo 256px + overlay `.img-legend` centré. Les classes `.img-foreground`/`.img-legend`/`.img-legend-text` ne sont utilisées QUE par ce composant (vérifié par grep) — on les remplace.
- `react/src/components/HomePage.js` : pills contour gris (`.big-button`), label « Ponthé 028 » (`.team-down`), photo d'équipe `/static/assets/img/028_group.jpg` + roster texte (`.team-desc`). Aucun test existant.
- `react/src/App.css` (617 lignes) : navbar `.c-nav` pervenche `#8193F2` (NE PAS TOUCHER — le logo `<Navbar.Brand href="/">` reste le lien accueil), `.gallery-title` pervenche, `.login-container` border 1px radius 3px.
- `react/src/components/Navbar.js` : déjà conforme au design (logo → accueil, pervenche) — interdiction de le modifier dans ce plan.
- Variables globales : `is_authenticated`, `is_staff`, `is_superuser` injectées par Django (navbar les lit — ne pas y toucher).

### Contraintes verrouillées (décisions prises avec l'utilisateur)
- Identité conservée : pervenche `#8193F2`, jaune `rgb(255 196 37)`, fond blanc, Inter, logo Ponthé cliquable vers l'accueil.
- Page galeries : version « Affiche **arrondie** » (32px bandeau / 16px cartes).
- Accueil : photo du hero SANS voile bleu — uniquement un dégradé noir pour la lisibilité.
- Pas de Tailwind, pas de nouvelle dépendance : tout en CSS vanilla dans `App.css` + grid Bootstrap existante.
- L'exposition hérite automatiquement du nouveau look (même bundle `Galleries.js`, titre `EXPOSITIONS`).
- La gestion et la vue galerie interne ne sont PAS redessinées ici (hors périmètre) — seule une diffusion CSS légère est prévue (Task 4).

### Conventions de commit
Messages en français, un commit par tâche.

---

## File Structure

```
react/src/index.css                    # Task 1 : Inter en police de base
react/src/App.css                      # Task 1-4 : tokens :root + styles des deux pages + diffusion
react/src/components/Galleries.js      # Task 2 : bandeau pervenche + pills d'année (remplace le Select MUI)
react/src/components/GalleryLink.js    # Task 2 : carte affiche arrondie
react/src/components/GalleryMosaic.js  # Task 2 : gutters 24px
react/src/components/Galleries.test.js # Task 2 : nouveau
react/src/components/GalleryLink.test.js # Task 2 : nouveau
react/src/components/HomePage.js       # Task 3 : hero plein écran + équipe en cartes
react/src/components/HomePage.test.js  # Task 3 : nouveau
react/src/components/Material.js      # Task 4 : titre de page structuré
```

---

### Task 0: Setup du worktree

**Files:** — (aucun commit)

- [ ] **Step 1: Installer les dépendances front**

```bash
cd /Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh/react
npm install --no-audit --no-fund
```

- [ ] **Step 2: Vérifier la baseline**

Run: `CI=true npm test -- --watchAll=false`
Expected: `1 failed, 71 passed` environ — le seul échec est `src/App.test.js` (boilerplate CRA, préexistant). Toutes les autres suites passent (GallerySticker, PictureMosaic, GestionGallery, ReportDialog, ReportList, Gallery).

---

### Task 1: Tokens de design + typographie de base

**Files:**
- Modify: `react/src/index.css`
- Modify: `react/src/App.css` (bloc `:root` en tête + `.c-nav`/`.gallery-title` migrent vers les variables)

- [ ] **Step 1: Basculer la police de base sur Inter**

Dans `react/src/index.css`, remplacer la règle `body` :

```css
body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

(Inter est déjà chargée par `back/galerie/templates/head.html` — aucune nouvelle dépendance.)

- [ ] **Step 2: Poser les variables CSS**

En tête de `react/src/App.css`, après `body{...}` :

```css
/* Design tokens Ponthé — validés sur le canvas Superdesign (Affiche arrondie / Hero osé) */
:root{
  --ponthe-blue: #8193F2;        /* pervenche : navbar, bandeaux, pieds de cartes */
  --ponthe-blue-deep: #5B6FD6;   /* ombre dure des cartes affiche */
  --ponthe-blue-dark: #4353B8;   /* titres de cartes */
  --ponthe-yellow: rgb(255, 196, 37); /* accent : hover, pills actives, outline */
  --ponthe-gray-border: #cfcfcf;
  --ponthe-radius-banner: 32px;
  --ponthe-radius-card: 16px;
}
```

- [ ] **Step 3: Migrer les valeurs existantes vers les variables**

Dans `react/src/App.css`, remplacer les occurrences littérales (et uniquement elles) :

```css
.c-nav{
  background-color: var(--ponthe-blue);
  box-shadow: 0px 0px 7px 0px rgba(0,0,0,0.5);
}
```

```css
.gallery-title{
  margin-top: 50px;
  margin-bottom: 50px;
  color: var(--ponthe-blue);
  text-align: center;
  font-family: 'Inter';
  font-weight: bold;
}
```

et dans le bloc mobile (`.img-legend-text` hover, `.big-button:hover`, `.ytb-btn:hover`) remplacer `rgb(255 196 37)` par `var(--ponthe-yellow)`.

- [ ] **Step 4: Vérifier**

Run: `CI=true npm test -- --watchAll=false`
Expected: même état que la baseline (seul App.test.js échoue). Aucun test ne teste ces valeurs, la suite garantit juste l'absence de régression.

- [ ] **Step 5: Commit**

```bash
cd /Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh
git add react/src/index.css react/src/App.css
git commit -m "Design : tokens de couleur pervenche/jaune et Inter en typographie de base"
```

---

### Task 2: Page Galeries — bandeau pervenche, pills d'année, cartes affiche arrondies

Design « Affiche arrondie » (draft fde67747) : bandeau pervenche 220px à coins bas arrondis 32px contenant le titre `GAL`+`RIES` (900, 80px, RIES jaune) et les pills d'année blanches (active jaune) ; la grille chevauche le bandeau de 40px ; cartes à 4 coins arrondis 16px, cadre blanc 4px, ombre dure `8px 8px 0 #5B6FD6` + translation `-4px,-4px` au hover, pied pervenche 10px, titre sous la photo en `#4353B8`.

**Files:**
- Modify: `react/src/components/Galleries.js` (réécriture complète)
- Modify: `react/src/components/GalleryLink.js` (réécriture complète)
- Modify: `react/src/components/GalleryMosaic.js` (gutters)
- Modify: `react/src/App.css` (nouveau bloc styles galeries)
- Create: `react/src/components/Galleries.test.js`
- Create: `react/src/components/GalleryLink.test.js`

- [ ] **Step 1: Écrire les tests échouants**

Créer `react/src/components/Galleries.test.js` :

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Galleries from './Galleries';

jest.mock('js-cookie', () => ({
  get: jest.fn(() => 'fake-csrf-token'),
}));

jest.mock('./Navbar', () => () => <div data-testid="mock-navbar" />);

jest.mock('./GalleryMosaic', () => {
  return function MockGalleryMosaic(props) {
    return <div data-testid="gallery-mosaic" data-year={props.year} />;
  };
});

const mockGalleries = [
  { name: 'Croisière', slug: 'croisiere', sticker_url: '/media/croisiere/t.jpg', year: '2025-2026' },
  { name: 'Gala', slug: 'gala', sticker_url: '/media/gala/t.jpg', year: '2024-2025' },
];
const mockYears = [{ name: '2025-2026' }, { name: '2024-2025' }, { name: '2023-2024' }];

function mockFetch() {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/get_view')) {
      return Promise.resolve({ json: () => Promise.resolve(mockGalleries) });
    }
    if (url.includes('/api/years')) {
      return Promise.resolve({ json: () => Promise.resolve(mockYears) });
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  });
}

describe('Galleries (page liste des galeries)', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the pervenche banner with the poster title and yellow accent', async () => {
    render(<Galleries view="galerie" />);
    await waitFor(() =>
      expect(screen.getByText('GALRIES')).toBeInTheDocument()
    );
    expect(screen.getByText('RIES')).toBeInTheDocument();
    expect(screen.getByText('GALRIES').closest('.hero-banner')).toBeInTheDocument();
  });

  test('renders one pill per year, the first one active', async () => {
    render(<Galleries view="galerie" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '2025-2026' })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: '2025-2026' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: '2024-2025' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: '2023-2024' })).not.toHaveClass('active');
  });

  test('clicking a year pill updates the year passed to the mosaic', async () => {
    render(<Galleries view="galerie" />);
    await waitFor(() =>
      expect(screen.getByTestId('gallery-mosaic')).toBeInTheDocument()
    );
    expect(screen.getByTestId('gallery-mosaic').getAttribute('data-year')).toBe('2025-2026');
    fireEvent.click(screen.getByRole('button', { name: '2024-2025' }));
    await waitFor(() =>
      expect(screen.getByTestId('gallery-mosaic').getAttribute('data-year')).toBe('2024-2025')
    );
    expect(screen.getByRole('button', { name: '2024-2025' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: '2025-2026' })).not.toHaveClass('active');
  });

  test('exposition view titles the banner EXPOSITIONS', async () => {
    render(<Galleries view="exposition" />);
    await waitFor(() =>
      expect(screen.getByText('EXPOSITIONS')).toBeInTheDocument()
    );
    expect(screen.getByText('ITIONS')).toBeInTheDocument();
  });
});
```

Créer `react/src/components/GalleryLink.test.js` :

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import GalleryLink from './GalleryLink';

describe('GalleryLink (carte affiche arrondie)', () => {
  const props = { link: '/gallery/gala', sticker: '/media/gala/t.jpg', title: 'Gala' };

  test('renders a card link with the gallery slug as href', () => {
    const { container } = render(<GalleryLink {...props} />);
    const card = container.querySelector('.gallery-card-affiche');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/gallery/gala');
  });

  test('renders the photo, the pervenche strip and the title under the photo', () => {
    const { container } = render(<GalleryLink {...props} />);
    const img = container.querySelector('.galleries-img');
    expect(img).toHaveAttribute('src', '/media/gala/t.jpg');
    expect(img).toHaveAttribute('alt', 'Gala');
    expect(container.querySelector('.gallery-card-footer-strip')).toBeInTheDocument();
    expect(screen.getByText('Gala')).toHaveClass('gallery-title-label');
  });

  test('no longer uses the old centered overlay', () => {
    const { container } = render(<GalleryLink {...props} />);
    expect(container.querySelector('.img-legend')).not.toBeInTheDocument();
    expect(container.querySelector('.img-foreground')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd react && CI=true npm test -- Galleries`
Expected: FAIL (pas de `.hero-banner`, pas de pills, `GALRIES` introuvable).

Run: `cd react && CI=true npm test -- GalleryLink`
Expected: FAIL (pas de `.gallery-card-affiche`, titre dans l'ancien overlay).

- [ ] **Step 3: Réécrire GalleryLink.js**

Remplacer tout le contenu de `react/src/components/GalleryLink.js` :

```jsx
import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Col from 'react-bootstrap/Col';

const GalleryLink = (props) => {
    return(
          <Col xs="12" sm="6" lg="4" xl="3">
            <a className="gallery-card-affiche" href={props.link}>
              <div className="gallery-image-container">
                <img className="galleries-img" src={props.sticker} alt={props.title}/>
              </div>
              <div className="gallery-card-footer-strip"></div>
              <h3 className="gallery-title-label">{props.title}</h3>
            </a>
          </Col>
    );
};

export default GalleryLink;
```

- [ ] **Step 4: Réécrire Galleries.js**

Remplacer tout le contenu de `react/src/components/Galleries.js` (le `Select`/`MenuItem` MUI disparaissent, remplacés par des pills ; le flux de fetch est inchangé) :

```jsx
import React, {useState, useEffect} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Cookies from 'js-cookie';
import CustomNavbar from './Navbar';
import GalleryMosaic from './GalleryMosaic';

export default function Galleries(props) {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState('');
  const [result, setResult] = useState([]);

  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': Cookies.get('csrftoken')
    },
  };

  useEffect(() => {
    fetch('/api/get_view?view=' + props.view, requestOptions)
      .then(res => res.json())
      .then(
        (result) => {
          setResult(result)
          fetch('/api/years', requestOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setYears(result.map(y => y.name))
                setYear(result[0].name)
              },
              (error) => {
                console.log(error)
              }
            );
        },
        (error) => {
          console.log(error)
        }
      );
  }, [])

  const titleStart = props.view === 'exposition' ? 'EXPOS' : 'GAL';
  const titleEnd = props.view === 'exposition' ? 'ITIONS' : 'ERIES';

  return (
      <>
        <CustomNavbar/>
        <div className="hero-banner">
          <div className="hero-banner-inner">
            <h1 className="hero-title">{titleStart}<span className="hero-title-accent">{titleEnd}</span></h1>
            <div className="year-pills">
              {years.map(y => (
                <button key={y} type="button"
                  className={'year-pill' + (y === year ? ' active' : '')}
                  onClick={() => setYear(y)}>
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="gallery-grid-overlap">
          <GalleryMosaic result={result} year={year}/>
        </div>
      </>
    )
}
```

- [ ] **Step 5: Ajuster GalleryMosaic.js**

Dans `react/src/components/GalleryMosaic.js`, remplacer le `return` par (la `<Row>` vide est supprimée, les gutters passent à 24px) :

```jsx
    return (
        <>
            <Container fluid>
                <Row className="g-4">
                    {galleriesComp}
                </Row>
            </Container>
        </>
    );
```

(le reste du fichier — le `useEffect` de filtrage par année — est inchangé).

- [ ] **Step 6: Ajouter les styles dans App.css**

Ajouter à la fin de `react/src/App.css` (et modifier la règle `.galleries-img` existante : `height: 256px` → `height: 240px`) :

```css
/* ===== Page Galeries « Affiche arrondie » (draft fde67747) ===== */

.hero-banner{
  background-color: var(--ponthe-blue);
  border-bottom-left-radius: var(--ponthe-radius-banner);
  border-bottom-right-radius: var(--ponthe-radius-banner);
  position: relative;
}

.hero-banner-inner{
  max-width: 1140px;
  margin-left: auto;
  margin-right: auto;
  padding: 48px 12px 64px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.hero-title{
  font-family: 'Inter';
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  line-height: 0.9;
  color: white;
  font-size: clamp(48px, 8vw, 80px);
  margin: 0;
}

.hero-title-accent{
  color: var(--ponthe-yellow);
}

.year-pills{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
}

.year-pill{
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 50px;
  background: white;
  color: var(--ponthe-blue);
  font-family: 'Inter';
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.year-pill.active{
  background: var(--ponthe-yellow);
  color: black;
}

.year-pill:not(.active):hover{
  transform: translateY(-2px);
}

.gallery-grid-overlap{
  max-width: 1140px;
  margin-left: auto;
  margin-right: auto;
  margin-top: -40px;
  position: relative;
  z-index: 10;
  padding: 0 12px 96px;
}

.gallery-card-affiche{
  display: flex;
  flex-direction: column;
  background: white;
  border: 4px solid white;
  border-radius: var(--ponthe-radius-card);
  overflow: hidden;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease-out;
  height: 100%;
}

.gallery-card-affiche:hover{
  transform: translate(-4px, -4px);
  box-shadow: 8px 8px 0 var(--ponthe-blue-deep);
}

.gallery-image-container{
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
}

.gallery-card-footer-strip{
  height: 10px;
  background-color: var(--ponthe-blue);
}

.gallery-title-label{
  padding: 12px 16px 8px;
  font-family: 'Inter';
  font-weight: 700;
  font-size: 18px;
  color: var(--ponthe-blue-dark);
  margin: 0;
  letter-spacing: -0.01em;
}

@media screen and (max-width: 575px) {
  .hero-banner-inner{
    padding: 32px 12px 48px;
  }

  .year-pills{
    padding-bottom: 0;
  }
}
```

- [ ] **Step 7: Vérifier les tests**

Run: `cd react && CI=true npm test -- Galleries`
Expected: PASS (4 tests).

Run: `cd react && CI=true npm test -- GalleryLink`
Expected: PASS (3 tests).

Run: `cd react && CI=true npm test -- --watchAll=false`
Expected: seul App.test.js échoue (baseline). Vérifier notamment que `PictureMosaic`, `Gallery` et `GestionGallery` passent toujours (ils n'utilisent pas GalleryLink).

- [ ] **Step 8: Commit**

```bash
cd /Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh
git add react/src/components/Galleries.js react/src/components/GalleryLink.js react/src/components/GalleryMosaic.js react/src/components/Galleries.test.js react/src/components/GalleryLink.test.js react/src/App.css
git commit -m "Galeries : bandeau pervenche, pills d'année et cartes affiche arrondies"
```

---

### Task 3: Page d'accueil — hero plein écran « Hero osé sans voile »

Design « Hero osé sans voile » (draft 6376c5fd) : hero 100vh avec la photo d'équipe en fond (SANS voile bleu — uniquement un dégradé noir `rgba(0,0,0,0.2)` → `rgba(0,0,0,0.75)` pour la lisibilité), titre « PONTHÉ » 900 120px blanc avec duplicata outline jaune décalé de 6px et badge « 028 » en pill jaune, sous-titre, deux pills solides (jaune → hover blanc ; blanche → hover jaune), chevron de scroll jaune animé ; section équipe : photo arrondie 24px inclinée -1deg, titre « L'ÉQUIPE » pervenche 48px 900, roster en 2 colonnes de cartes (1px `#cfcfcf`, radius 8px, hover bordure pervenche) ; petit pied de page.

**Files:**
- Modify: `react/src/components/HomePage.js` (réécriture complète)
- Modify: `react/src/App.css` (nouveau bloc styles accueil)
- Create: `react/src/components/HomePage.test.js`

- [ ] **Step 1: Écrire les tests échouants**

Créer `react/src/components/HomePage.test.js` :

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';

jest.mock('./Navbar', () => () => <div data-testid="mock-navbar" />);

describe('HomePage (hero osé sans voile)', () => {
  test('renders the poster title PONTHÉ twice (fill + yellow outline)', () => {
    render(<HomePage />);
    const titles = screen.getAllByText('PONTHÉ');
    expect(titles.length).toBe(2);
    expect(titles[0].className).toContain('poster-title');
    expect(titles[1].className).toContain('poster-title-outline');
  });

  test('renders the yellow 028 badge', () => {
    render(<HomePage />);
    expect(screen.getByText('028')).toHaveClass('badge-hero-yellow');
  });

  test('renders the subtitle about the club', () => {
    render(<HomePage />);
    expect(
      screen.getByText("Club photo & vidéo de l'École des Ponts")
    ).toBeInTheDocument();
  });

  test('renders the two hero pills with correct hrefs', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Accéder aux galeries/i })).toHaveAttribute(
      'href',
      '/galleries'
    );
    const yt = screen.getByRole('link', { name: /Chaîne Youtube/i });
    expect(yt.getAttribute('href')).toContain('youtube.com');
    expect(screen.getByRole('link', { name: /Accéder aux galeries/i })).toHaveClass('pill-yellow');
    expect(yt).toHaveClass('pill-white');
  });

  test('renders the animated scroll chevron', () => {
    render(<HomePage />);
    expect(document.querySelector('.scroll-chevron')).toBeInTheDocument();
  });

  test('renders the team section with roster cards', () => {
    render(<HomePage />);
    expect(screen.getByText(/l'équipe/i)).toBeInTheDocument();
    expect(screen.getByText('Le Bureau')).toBeInTheDocument();
    expect(screen.getByText('Responsables')).toBeInTheDocument();
    expect(screen.getByText('Pôle Création')).toBeInTheDocument();
    expect(screen.getByText(/Présidente/)).toBeInTheDocument();
    expect(document.querySelectorAll('.roster-card-item').length).toBe(3);
  });

  test('renders the footer', () => {
    render(<HomePage />);
    expect(
      screen.getByText(/Club Ponthé — École des Ponts/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd react && CI=true npm test -- HomePage`
Expected: FAIL sur tous les tests (l'ancienne page n'a ni hero ni poster title).

- [ ] **Step 3: Réécrire HomePage.js**

Remplacer tout le contenu de `react/src/components/HomePage.js` (la photo du hero est la vraie photo d'équipe du site — asset de marque, pas de placeholder) :

```jsx
import React from 'react'
import CustomNavbar from './Navbar'
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import './../App.css';

export default function HomePage (){

    return (
        <>
            <CustomNavbar/>
            <main>
                <section className="hero-section">
                    <div className="hero-content">
                        <div className="poster-title-container">
                            <div className="badge-hero-yellow">028</div>
                            <h1 className="poster-title">PONTHÉ</h1>
                            <div className="poster-title-outline" aria-hidden="true">PONTHÉ</div>
                        </div>
                        <p className="hero-subtitle">Club photo &amp; vidéo de l'École des Ponts</p>
                        <div className="hero-pills">
                            <a className="pill-btn pill-yellow" href="/galleries">Accéder aux galeries</a>
                            <a className="pill-btn pill-white" href="https://www.youtube.com/@ponthe-ecoledesponts7542">Chaîne Youtube</a>
                        </div>
                        <a className="scroll-chevron" href="#team" aria-label="Voir l'équipe">
                            <KeyboardDoubleArrowDownIcon/>
                        </a>
                    </div>
                </section>

                <a name="team"></a>
                <section className="team-section">
                    <div className="team-section-inner">
                        <img className="team-img-rounded" src="/static/assets/img/028_group.jpg" alt="L'équipe Ponthé 028"/>
                        <h2 className="team-section-title">L'équipe</h2>
                        <div className="roster-grid">
                            <div className="roster-column">
                                <h3 className="roster-group-title">Le Bureau</h3>
                                <div className="roster-card-item">
                                    <p><strong>Présidente :</strong> Alice Dubreux</p>
                                    <p><strong>V-Prez Photo :</strong> Romain Soulabail</p>
                                    <p><strong>V-Prez Vidéo :</strong> Louis Cussoneau</p>
                                    <p><strong>Trez :</strong> Émilie Duccini</p>
                                </div>
                                <h3 className="roster-group-title">Responsables</h3>
                                <div className="roster-card-item">
                                    <p><strong>Respo Matos :</strong> Paul Lemeunier</p>
                                    <p><strong>Respo Galeries :</strong> Maxime Novo-Frelicot</p>
                                    <p><strong>Respo Comm :</strong> Vincent Huynh</p>
                                </div>
                            </div>
                            <div className="roster-column">
                                <h3 className="roster-group-title">Pôle Création</h3>
                                <div className="roster-card-item">
                                    <p className="roster-subtitle">Vidéastes</p>
                                    <p className="roster-names">Océane Chia, Louis Laverrière, Clovis Vialard, Sophie Balmitgère</p>
                                    <p className="roster-subtitle">Photographes</p>
                                    <p className="roster-names">Maxime Préel, Pétronille Sylvestre, Juliette Houriez, Mathilde David, Sélène Baudoux, Saül Buchwald, Lucie Agnese, Maxence Brechon</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="site-footer">
                <p>© 2026 Club Ponthé — École des Ponts ParisTech</p>
            </footer>
        </>
    )
}
```

- [ ] **Step 4: Ajouter les styles dans App.css**

Ajouter à la fin de `react/src/App.css` (les anciennes règles `.big-button`, `.team-down`, `.team-desc`, `.img-team`, `.main-intro-div` ne sont plus utilisées — les laisser en place, elles ne cassent rien ; la Task 4 ne les supprime pas non plus pour garder un diff minimal) :

```css
/* ===== Accueil « Hero osé sans voile » (draft 6376c5fd) ===== */

.hero-section{
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  text-align: center;
  padding: 120px 16px 48px;
  background-image:
    linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0.75) 100%),
    url('/static/assets/img/028_group.jpg');
  background-size: cover;
  background-position: center;
}

.hero-content{
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-title-container{
  position: relative;
  margin-bottom: 32px;
}

.poster-title{
  font-family: 'Inter';
  font-weight: 900;
  font-size: clamp(56px, 12vw, 120px);
  line-height: 0.9;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  color: white;
  margin: 0;
  position: relative;
  z-index: 10;
}

.poster-title-outline{
  position: absolute;
  top: 6px;
  left: 6px;
  font-family: 'Inter';
  font-weight: 900;
  font-size: clamp(56px, 12vw, 120px);
  line-height: 0.9;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  color: transparent;
  -webkit-text-stroke: 2px var(--ponthe-yellow);
  z-index: 5;
  user-select: none;
  pointer-events: none;
}

.badge-hero-yellow{
  position: absolute;
  right: -40px;
  top: -10px;
  z-index: 20;
  background-color: var(--ponthe-yellow);
  color: black;
  padding: 4px 12px;
  border-radius: 50px;
  font-family: 'Inter';
  font-weight: 900;
  font-size: 24px;
}

.hero-subtitle{
  color: white;
  font-family: 'Inter';
  font-size: clamp(16px, 2.5vw, 24px);
  font-weight: 300;
  letter-spacing: 0.02em;
  margin: 0 0 48px;
}

.hero-pills{
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.pill-btn{
  text-transform: uppercase;
  padding: 20px 40px;
  font-family: 'Inter';
  font-weight: 700;
  font-size: 20px;
  border-radius: 50px;
  border: 2px solid transparent;
  text-decoration: none;
  transition: all 0.3s ease;
}

.pill-yellow{
  background-color: var(--ponthe-yellow);
  color: black;
}

.pill-yellow:hover,
.pill-yellow:focus{
  background-color: white;
  color: black;
}

.pill-white{
  background-color: white;
  color: black;
}

.pill-white:hover,
.pill-white:focus{
  background-color: var(--ponthe-yellow);
  color: black;
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(10px); }
}

.scroll-chevron{
  color: var(--ponthe-yellow);
  font-size: 3rem;
  margin-top: 32px;
  animation: bounce-slow 2s infinite;
}

.team-section{
  background: white;
  overflow: hidden;
  padding: 96px 16px 0;
}

.team-section-inner{
  max-width: 1152px;
  margin-left: auto;
  margin-right: auto;
}

.team-img-rounded{
  border-radius: 24px;
  width: 100%;
  aspect-ratio: 21 / 9;
  object-fit: cover;
  transform: rotate(-1deg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  margin-bottom: 80px;
}

.team-section-title{
  text-align: center;
  font-family: 'Inter';
  font-weight: 900;
  font-size: clamp(32px, 5vw, 48px);
  color: var(--ponthe-blue);
  text-transform: uppercase;
  letter-spacing: -0.04em;
  margin: 0 0 64px;
}

.roster-grid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  padding-bottom: 96px;
}

@media screen and (min-width: 768px) {
  .roster-grid{
    grid-template-columns: 1fr 1fr;
  }
}

.roster-column{
  display: flex;
  flex-direction: column;
}

.roster-group-title{
  font-family: 'Inter';
  font-size: 12px;
  font-weight: 700;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0 0 16px;
}

.roster-group-title:not(:first-child){
  margin-top: 48px;
}

.roster-card-item{
  border: 1px solid var(--ponthe-gray-border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.roster-card-item:hover{
  border-color: var(--ponthe-blue);
  box-shadow: 0 4px 12px rgba(129, 147, 242, 0.1);
}

.roster-card-item p{
  margin: 0 0 8px;
}

.roster-card-item p:last-child{
  margin-bottom: 0;
}

.roster-card-item strong{
  color: #212529;
}

.roster-subtitle{
  font-weight: 700;
  font-size: 18px;
  color: #212529;
}

.roster-names{
  color: #6c757d;
  font-size: 14px;
  line-height: 1.6;
}

.site-footer{
  background: white;
  padding: 48px 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 14px;
  border-top: 1px solid #f1f1f1;
}

@media screen and (max-width: 575px) {
  .badge-hero-yellow{
    right: 0;
    font-size: 18px;
  }

  .pill-btn{
    padding: 16px 28px;
    font-size: 16px;
  }
}
```

- [ ] **Step 5: Vérifier les tests**

Run: `cd react && CI=true npm test -- HomePage`
Expected: PASS (7 tests).

Run: `cd react && CI=true npm test -- --watchAll=false`
Expected: seul App.test.js échoue (baseline).

- [ ] **Step 6: Commit**

```bash
cd /Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh
git add react/src/components/HomePage.js react/src/components/HomePage.test.js react/src/App.css
git commit -m "Accueil : hero plein écran sans voile, titre affiche jaune et équipe en cartes"
```

---

### Task 4: Diffusion légère du style aux pages restantes

CSS uniquement, pour que les pages non redessinées ne détonnent pas. Aucun changement de composant sauf `Material.js` (titre de page).

**Files:**
- Modify: `react/src/App.css`
- Modify: `react/src/components/Material.js`

- [ ] **Step 1: Page Matériel — un vrai titre**

Remplacer le `<div className="main-intro-div"><h1> Matériel </h1></div>` de `react/src/components/Material.js` par :

```jsx
            <div className="page-header">
                <h1 className="page-header-title">Matériel</h1>
            </div>
```

- [ ] **Step 2: Styles de diffusion dans App.css**

Ajouter à la fin de `react/src/App.css` :

```css
/* ===== Diffusion du style vers les pages non redessinées ===== */

.page-header{
  max-width: 1140px;
  margin: 0 auto;
  padding: 48px 12px 32px;
}

.page-header-title{
  font-family: 'Inter';
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  color: var(--ponthe-blue);
  font-size: clamp(40px, 6vw, 56px);
  margin: 0;
}

/* Vue galerie : le titre suit la même typo que la page liste */
.gallery-title{
  font-family: 'Inter';
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  font-size: clamp(32px, 5vw, 48px);
}

/* Login : la carte suit les rayons du design */
.login-container{
  border: 1px solid var(--ponthe-gray-border);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
```

(la règle `.login-container` existante de App.css est remplacée par celle-ci — supprimer l'ancienne, qui a `border-radius: 3px`).

- [ ] **Step 3: Vérifier**

Run: `cd react && CI=true npm test -- --watchAll=false`
Expected: seul App.test.js échoue (baseline). Aucun test ne cible ces classes.

- [ ] **Step 4: Commit**

```bash
cd /Users/maxime/.config/superpowers/worktrees/ponthe-website/design-refresh
git add react/src/App.css react/src/components/Material.js
git commit -m "Design : diffusion du style aux pages matériel, vue galerie et login"
```

---

### Task 5: Vérification complète

**Files:** —

- [ ] **Step 1: Suite Jest complète**

Run: `cd react && CI=true npm test -- --watchAll=false`
Expected: `1 failed, ~85 passed` — le seul échec est `App.test.js` (préexistant). Toutes les nouvelles suites (Galleries, GalleryLink, HomePage) et anciennes (Gallery, PictureMosaic, GallerySticker, GestionGallery, ReportDialog, ReportList) passent.

- [ ] **Step 2: Build de production**

Run: `cd react && CI=true npm run build`
Expected: `Compiled successfully` (aucune erreur ESLint bloquante, warnings tolérés comme à l'accoutumée).

- [ ] **Step 3: Vérification visuelle manuelle (checkout principal, après merge)**

Une fois la branche fusionnée dans master et la stack Docker up (`http://localhost:8000`) :
1. `/` : hero plein écran avec la photo d'équipe, « PONTHÉ » à outline jaune + badge 028, pills jaune/blanche, chevron animé, section équipe en 2 colonnes de cartes, footer.
2. `/galleries/` : bandeau pervenche arrondi « GALRIES » (RIES jaune) + pills d'année, cartes chevauchant le bandeau, hover = ombre dure bleu profond, pied pervenche, titre bleu foncé.
3. `/expositions/` : même page avec « EXPOSITIONS ».
4. `/material/` : titre pervenche 56px.
5. `/login/` : carte arrondie 12px.
6. Navbar sur toutes les pages : logo Ponthé cliquable → accueil (inchangé).

- [ ] **Step 4: Revue finale**

Aucun commit ici. Passer la branche en revue (requesting-code-review) puis fusionner via finishing-a-development-branch.

---

## Self-Review

**Couverture :**
- « Affiche arrondie » pour /galleries ET /expositions (même bundle, titre dynamique) → Task 2.
- « Hero osé sans voile » pour l'accueil → Task 3.
- Logo Ponthé → accueil conservé → la navbar n'est jamais modifiée (aucun fichier de navbar dans les tâches ; l'ancrage `<a name="team">` passe de `main-intro-div` à la nouvelle section, la navbar garde son lien `/#team`).
- Diffusion légère aux autres pages → Task 4.
- Vérification → Task 5.

**Placeholders :** aucun — chaque étape contient le code complet ou la commande exacte avec le résultat attendu.

**Cohérence des types/noms :** classes CSS introduites (`hero-banner`, `hero-banner-inner`, `hero-title`, `hero-title-accent`, `year-pill`, `gallery-grid-overlap`, `gallery-card-affiche`, `gallery-card-footer-strip`, `gallery-title-label`, `poster-title`, `poster-title-outline`, `badge-hero-yellow`, `hero-subtitle`, `hero-pills`, `pill-btn`, `pill-yellow`, `pill-white`, `scroll-chevron`, `team-section`, `team-section-inner`, `team-img-rounded`, `team-section-title`, `roster-grid`, `roster-column`, `roster-group-title`, `roster-card-item`, `roster-subtitle`, `roster-names`, `site-footer`, `page-header`, `page-header-title`) — chacune posée une seule fois, utilisée dans le JSX correspondant et testée quand elle porte du comportement. Variables CSS posées en Task 1, utilisées en Tasks 2-4.

**Limitations assumées :**
- Les anciennes classes de l'accueil (`.big-button`, `.team-down`, `.team-desc`, `.img-team`, `.main-intro-div`) restent dans App.css (inutilisées) pour un diff minimal.
- Le hero accueil utilise la photo d'équipe 028 en `background-image` : sur mobile elle est recadrée en cover — vérifié visuellement en Task 5.
- La gestion n'est pas redessinée (hors périmètre décidé).
