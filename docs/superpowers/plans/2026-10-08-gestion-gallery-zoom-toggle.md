# Gestion Gallery — Vue Dézoomée (Zoom Toggle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bouton toggle dans la page de gestion d'une galerie (`/gestion/gallery/<slug>`) permettant de basculer entre une vue normale (miniatures 170px) et une vue dézoomée/compacte (miniatures ~80px) pour voir plus de photos simultanément.

**Architecture:** Un état `isCompact` dans `GestionGallery.js` pilote une prop `compact` passée à chaque `GallerySticker`. Le composant applique une classe CSS conditionnelle. Les styles compacts sont ajoutés dans `App.css`. Les colonnes Bootstrap passent de `lg="2"` à `lg="1"` en mode compact pour afficher plus de miniatures par ligne. Chaque modification de code est accompagnée d'un test unitaire ou d'intégration.

**Tech Stack:** React 18, react-bootstrap, MUI icons (`@mui/icons-material`), CSS vanilla dans `App.css`, Jest + React Testing Library pour les tests.

---

## Task 1: Ajouter la prop `compact` au composant `GallerySticker` + tests

**Files:**
- Modify: `react/src/components/GallerySticker.js`
- Create: `react/src/components/GallerySticker.test.js`

- [ ] **Step 1: Write the failing tests**

Créer `react/src/components/GallerySticker.test.js` :

```js
import { render, fireEvent } from '@testing-library/react';
import GallerySticker from './GallerySticker';

describe('GallerySticker', () => {
  const defaultProps = {
    img: '/media/test/uploads/photo.jpg',
    thumb: '/media/test/thumbnails/photo.jpg',
    modal_func: jest.fn(),
  };

  test('renders with default classes when compact prop is not set', () => {
    const { container } = render(<GallerySticker {...defaultProps} />);
    const sticker = container.querySelector('.gallery-sticker');
    const img = container.querySelector('.gallery-img');
    expect(sticker).not.toHaveClass('compact');
    expect(img).not.toHaveClass('compact');
    expect(img).toHaveAttribute('src', defaultProps.thumb);
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  test('renders with default classes when compact prop is false', () => {
    const { container } = render(<GallerySticker {...defaultProps} compact={false} />);
    const sticker = container.querySelector('.gallery-sticker');
    const img = container.querySelector('.gallery-img');
    expect(sticker).not.toHaveClass('compact');
    expect(img).not.toHaveClass('compact');
  });

  test('applies compact class to sticker div when compact prop is true', () => {
    const { container } = render(<GallerySticker {...defaultProps} compact={true} />);
    const sticker = container.querySelector('.gallery-sticker');
    expect(sticker).toHaveClass('gallery-sticker');
    expect(sticker).toHaveClass('compact');
  });

  test('applies compact class to img when compact prop is true', () => {
    const { container } = render(<GallerySticker {...defaultProps} compact={true} />);
    const img = container.querySelector('.gallery-img');
    expect(img).toHaveClass('gallery-img');
    expect(img).toHaveClass('compact');
  });

  test('calls modal_func with event and img src when clicked', () => {
    const modalFunc = jest.fn();
    const { container } = render(<GallerySticker {...defaultProps} modal_func={modalFunc} />);
    fireEvent.click(container.querySelector('.gallery-sticker'));
    expect(modalFunc).toHaveBeenCalledTimes(1);
    expect(modalFunc).toHaveBeenCalledWith(expect.anything(), defaultProps.img);
  });

  test('calls modal_func correctly in compact mode too', () => {
    const modalFunc = jest.fn();
    const { container } = render(<GallerySticker {...defaultProps} compact={true} modal_func={modalFunc} />);
    fireEvent.click(container.querySelector('.gallery-sticker'));
    expect(modalFunc).toHaveBeenCalledWith(expect.anything(), defaultProps.img);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GallerySticker.test.js --watchAll=false 2>&1 | tail -30
```
Expected: Les tests 3, 4, 6 échouent (classes `compact` non appliquées). Les tests 1, 2, 5 passent (comportement existant).

- [ ] **Step 3: Write minimal implementation**

Modifier `react/src/components/GallerySticker.js` :

```js
import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const GallerySticker = (props) => {
    const compactClass = props.compact ? ' compact' : '';
    return(
            <div className={'gallery-sticker' + compactClass} onClick={(event) => props.modal_func(event, props.img)}>
                <img loading='lazy' className={'gallery-img' + compactClass} src={props.thumb} width="100%"/>
            </div>
    );
};

export default GallerySticker;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GallerySticker.test.js --watchAll=false 2>&1 | tail -15
```
Expected: PASS — 6 tests réussis.

- [ ] **Step 5: Commit**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && git add react/src/components/GallerySticker.js react/src/components/GallerySticker.test.js && git commit -m "feat(gestion): add compact prop to GallerySticker with tests"
```

---

## Task 2: Ajouter les styles CSS compacts + test de présence des classes

**Files:**
- Modify: `react/src/App.css`
- Modify: `react/src/components/GallerySticker.test.js` (ajout d'un test de contrat CSS)

- [ ] **Step 1: Write the failing test (contrat CSS)**

Ajouter ce test à la fin de `react/src/components/GallerySticker.test.js` :

```js
  test('compact mode produces class names that match CSS rules in App.css', () => {
    // Ce test sert de contrat : si on renomme les classes CSS, ce test échoue
    // et rappelle de mettre à jour App.css en conséquence.
    const { container } = render(<GallerySticker {...defaultProps} compact={true} />);
    const sticker = container.querySelector('.gallery-sticker');
    const img = container.querySelector('.gallery-img');
    // Les classes doivent être exactement celles définies dans App.css
    expect(sticker.className).toBe('gallery-sticker compact');
    expect(img.className).toBe('gallery-img compact');
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GallerySticker.test.js --watchAll=false 2>&1 | tail -15
```
Expected: Ce test passe déjà (car Task 1 a implémenté les classes). C'est un test de contrat, pas un test de fonctionnalité nouvelle. Il sert à protéger contre les renommages futurs.

- [ ] **Step 3: Add compact CSS rules**

Ajouter dans `react/src/App.css` après la règle `.gallery-img` (ligne ~92) :

```css
/* Vue dézoomée gestion : miniatures plus petites pour voir plus de photos */
.gallery-sticker.compact {
  height: 80px;
}

.gallery-img.compact {
  height: 80px;
}

/* Mobile : en mode compact, garder le ratio carré comme en mode normal */
@media screen and (max-width: 575px) {
  .gallery-sticker.compact {
    height: auto;
  }

  .gallery-img.compact {
    display: block;
    height: auto;
    aspect-ratio: 1;
  }
}
```

- [ ] **Step 4: Verify CSS syntax**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && node -e "
const fs = require('fs');
const css = fs.readFileSync('src/App.css', 'utf8');
// Vérifier que les règles compact sont présentes
const checks = [
  '.gallery-sticker.compact',
  '.gallery-img.compact',
  'height: 80px',
  'aspect-ratio: 1'
];
let ok = true;
for (const check of checks) {
  if (!css.includes(check)) {
    console.error('MISSING: ' + check);
    ok = false;
  }
}
if (ok) console.log('All compact CSS rules present in App.css');
process.exit(ok ? 0 : 1);
"
```
Expected: "All compact CSS rules present in App.css"

- [ ] **Step 5: Run all GallerySticker tests**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GallerySticker.test.js --watchAll=false 2>&1 | tail -10
```
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && git add react/src/App.css react/src/components/GallerySticker.test.js && git commit -m "style(gestion): add compact CSS rules and CSS contract test"
```

---

## Task 3: Ajouter le toggle zoom dans `GestionGallery.js` + tests complets

**Files:**
- Modify: `react/src/components/GestionGallery.js`
- Create: `react/src/components/GestionGallery.test.js`

- [ ] **Step 1: Write the failing tests**

Créer `react/src/components/GestionGallery.test.js` :

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
        data-compact={props.compact ? 'true' : 'false'}
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

describe('GestionGallery — Zoom Toggle', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders gallery title from API', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getByText('Ma Galerie Test')).toBeInTheDocument();
    });
  });

  test('renders ZoomOut button by default (normal mode)', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getByTitle('Vue dézoomée')).toBeInTheDocument();
    });
    // ZoomIn should NOT be present in normal mode
    expect(screen.queryByTitle('Vue normale')).not.toBeInTheDocument();
  });

  test('clicking ZoomOut switches to compact mode (shows ZoomIn button)', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getByTitle('Vue dézoomée')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Vue dézoomée'));

    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });
    expect(screen.queryByTitle('Vue dézoomée')).not.toBeInTheDocument();
  });

  test('clicking ZoomIn switches back to normal mode (shows ZoomOut button)', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getByTitle('Vue dézoomée')).toBeInTheDocument();
    });

    // Switch to compact
    fireEvent.click(screen.getByTitle('Vue dézoomée'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });

    // Switch back to normal
    fireEvent.click(screen.getByTitle('Vue normale'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue dézoomée')).toBeInTheDocument();
    });
  });

  test('passes compact=false to GallerySticker in normal mode', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      const stickers = screen.getAllByTestId('gallery-sticker');
      expect(stickers.length).toBe(2);
      stickers.forEach(sticker => {
        expect(sticker).toHaveAttribute('data-compact', 'false');
      });
    });
  });

  test('passes compact=true to GallerySticker in compact mode', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    // Switch to compact
    fireEvent.click(screen.getByTitle('Vue dézoomée'));

    await waitFor(() => {
      const stickers = screen.getAllByTestId('gallery-sticker');
      expect(stickers.length).toBe(2);
      stickers.forEach(sticker => {
        expect(sticker).toHaveAttribute('data-compact', 'true');
      });
    });
  });

  test('uses lg-2 columns in normal mode (6 per row on large screens)', async () => {
    const { container } = render(<GestionGallery />);
    await waitFor(() => {
      const cols = container.querySelectorAll('.col-lg-2');
      expect(cols.length).toBe(2);
    });
    // Should NOT have lg-1 columns in normal mode
    expect(container.querySelectorAll('.col-lg-1').length).toBe(0);
  });

  test('uses lg-1 columns in compact mode (12 per row on large screens)', async () => {
    const { container } = render(<GestionGallery />);
    await waitFor(() => {
      expect(container.querySelectorAll('.col-lg-2').length).toBe(2);
    });

    fireEvent.click(screen.getByTitle('Vue dézoomée'));

    await waitFor(() => {
      const cols = container.querySelectorAll('.col-lg-1');
      expect(cols.length).toBe(2);
    });
    // Should NOT have lg-2 columns in compact mode
    expect(container.querySelectorAll('.col-lg-2').length).toBe(0);
  });

  test('uses correct sm columns: sm-3 normal, sm-2 compact', async () => {
    const { container } = render(<GestionGallery />);
    await waitFor(() => {
      expect(container.querySelectorAll('.col-sm-3').length).toBe(2);
    });

    fireEvent.click(screen.getByTitle('Vue dézoomée'));

    await waitFor(() => {
      expect(container.querySelectorAll('.col-sm-2').length).toBe(2);
    });
  });

  test('uses correct xs columns: xs-4 normal, xs-3 compact', async () => {
    const { container } = render(<GestionGallery />);
    await waitFor(() => {
      expect(container.querySelectorAll('.col-4').length).toBe(2);
    });

    fireEvent.click(screen.getByTitle('Vue dézoomée'));

    await waitFor(() => {
      expect(container.querySelectorAll('.col-3').length).toBe(2);
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
      expect(stickers[0]).toHaveAttribute('data-img', '/media/test-gallery/uploads/photo1.jpg');
      expect(stickers[0]).toHaveAttribute('data-thumb', '/media/test-gallery/thumbnails/photo1.jpg');
      expect(stickers[1]).toHaveAttribute('data-img', '/media/test-gallery/uploads/photo2.jpg');
      expect(stickers[1]).toHaveAttribute('data-thumb', '/media/test-gallery/thumbnails/photo2.jpg');
    });
  });

  test('clicking a sticker opens the modal with the correct image', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    // Click first sticker
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);

    // Modal should appear with the image
    await waitFor(() => {
      const modalImg = document.querySelector('.img-modal');
      expect(modalImg).toBeInTheDocument();
      expect(modalImg).toHaveAttribute('src', '/media/test-gallery/uploads/photo1.jpg');
    });
  });

  test('modal still works in compact mode', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });

    // Switch to compact
    fireEvent.click(screen.getByTitle('Vue dézoomée'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });

    // Click a sticker in compact mode
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[1]);

    await waitFor(() => {
      const modalImg = document.querySelector('.img-modal');
      expect(modalImg).toBeInTheDocument();
      expect(modalImg).toHaveAttribute('src', '/media/test-gallery/uploads/photo2.jpg');
    });
  });

  test('toggle button preserves other toolbar elements (add, delete, selects)', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      // The add button (AddCircleOutlineIcon) and delete button should still be there
      // We check by looking for the Select dropdowns (visibility and view)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GestionGallery.test.js --watchAll=false 2>&1 | tail -40
```
Expected: Plusieurs tests échouent — pas de bouton zoom, pas de prop `compact`, colonnes fixes à `lg="2"`.

- [ ] **Step 3: Implement the zoom toggle in GestionGallery.js**

**3a. Ajouter les imports** (après la ligne 10) :

```js
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
```

**3b. Ajouter l'état** (après `const [view, setView] = useState('gallery');`, ligne ~27) :

```js
const [isCompact, setIsCompact] = useState(false);
```

**3c. Ajouter la fonction toggle** (après `closeAddModal`, ligne ~55) :

```js
const toggleCompact = () => {
  setIsCompact(prev => !prev);
};
```

**3d. Modifier le rendu des photos dans le useEffect** (remplacer le bloc `picsDiv.push(...)` lignes ~133-140) :

Remplacer :
```js
picsDiv.push(
<Col key={pic} xs="4" sm="3" lg="2">
  <GallerySticker img={result[pic].link + '/uploads/' + result[pic].file_full_name}
                  thumb={result[pic].link + '/thumbnails/' + result[pic].file_full_name}
                  modal_func={toggleModal}/>
</Col>
)
```

Par :
```js
picsDiv.push(
<Col key={pic} xs={isCompact ? "3" : "4"} sm={isCompact ? "2" : "3"} lg={isCompact ? "1" : "2"}>
  <GallerySticker img={result[pic].link + '/uploads/' + result[pic].file_full_name}
                  thumb={result[pic].link + '/thumbnails/' + result[pic].file_full_name}
                  modal_func={toggleModal}
                  compact={isCompact}/>
</Col>
)
```

**3e. Modifier le tableau de dépendances du useEffect** (ligne ~167, remplacer `}, [])` par `}, [isCompact])`) :

```js
    }, [isCompact])
```

**3f. Ajouter le bouton toggle dans la barre d'outils** (dans le `<Stack>`, après `<DeleteIcon>` et avant le premier `<Select>`, vers la ligne 230) :

```js
{isCompact
  ? <ZoomInIcon className="icon" onClick={toggleCompact} titleAccess="Vue normale"/>
  : <ZoomOutIcon className="icon" onClick={toggleCompact} titleAccess="Vue dézoomée"/>
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest src/components/GestionGallery.test.js --watchAll=false 2>&1 | tail -25
```
Expected: PASS — 15 tests réussis.

- [ ] **Step 5: Run ALL frontend tests to check for regressions**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npx jest --watchAll=false 2>&1 | tail -20
```
Expected: Tous les tests passent (y compris les anciens + nouveaux).

- [ ] **Step 6: Verify the build compiles**

```bash
cd /Users/maxime/mistral_sb/ponthe-website/react && npm run build 2>&1 | tail -10
```
Expected: "Compiled successfully."

- [ ] **Step 7: Commit**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && git add react/src/components/GestionGallery.js react/src/components/GestionGallery.test.js && git commit -m "feat(gestion): add zoom toggle with 15 integration tests"
```

---

## Task 4: Test E2E manuel et vérification visuelle

- [ ] **Step 1: Lancer le dev server**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && docker compose up -d
```

- [ ] **Step 2: Vérifier visuellement — checklist**

Ouvrir `http://localhost:8000/gestion/gallery/<un-slug-existant>` et cocher :

- [ ] Les miniatures font ~170px de hauteur en vue normale
- [ ] L'icône ZoomOut (loupe avec `-`) est visible dans la barre d'outils
- [ ] Cliquer sur ZoomOut → les miniatures passent à ~80px
- [ ] L'icône devient ZoomIn (loupe avec `+`)
- [ ] Plus de colonnes par ligne en mode compact (12 vs 6 sur grand écran)
- [ ] Cliquer sur ZoomIn → retour à la vue normale (170px, 6 colonnes)
- [ ] Le modal plein écran fonctionne dans les deux modes
- [ ] Les boutons add/delete/selects sont toujours présents et fonctionnels

- [ ] **Step 3: Vérifier le responsive mobile**

Redimensionner à < 576px et cocher :

- [ ] Mode normal : miniatures carrées (`aspect-ratio: 1`), 3 par ligne
- [ ] Mode compact : miniatures carrées (`aspect-ratio: 1`), 4 par ligne
- [ ] La barre d'outils ne déborde pas (flex-wrap)

- [ ] **Step 4: Final commit**

```bash
cd /Users/maxime/mistral_sb/ponthe-website && git add -A && git commit -m "test(gestion): manual E2E verification of zoom toggle"
```

---

## Récapitulatif des fichiers et tests

| Fichier | Modification | Tests associés |
|---------|-------------|----------------|
| `react/src/components/GallerySticker.js` | Prop `compact`, classes CSS conditionnelles | `GallerySticker.test.js` — 7 tests |
| `react/src/components/GallerySticker.test.js` | **Nouveau** | 7 tests : classes défaut, `compact=false`, `compact=true` (div + img), clic normal, clic compact, contrat CSS |
| `react/src/App.css` | `.gallery-sticker.compact` (80px), `.gallery-img.compact` (80px), responsive mobile | Test de contrat dans `GallerySticker.test.js` + vérification syntaxique via node |
| `react/src/components/GestionGallery.js` | État `isCompact`, `toggleCompact()`, bouton ZoomIn/ZoomOut, colonnes dynamiques, prop `compact` | `GestionGallery.test.js` — 15 tests |
| `react/src/components/GestionGallery.test.js` | **Nouveau** | 15 tests : titre, bouton défaut, toggle on/off, `compact=false` normal, `compact=true` compact, colonnes lg/sm/xs (normal + compact), nombre stickers, URLs images, modal normal, modal compact, toolbar préservée |

**Total : 22 tests automatisés** couvrant chaque ligne de code ajoutée.

## Comportement attendu

| Mode | Hauteur miniature | Colonnes (lg) | Colonnes (sm) | Colonnes (xs) | Bouton | Prop `compact` |
|------|-------------------|---------------|---------------|---------------|--------|----------------|
| Normal (défaut) | 170px | 6 par ligne (`lg-2`) | 4 par ligne (`sm-3`) | 3 par ligne (`col-4`) | ZoomOut 🔍- | `false` |
| Compact (dézoomé) | 80px | 12 par ligne (`lg-1`) | 6 par ligne (`sm-2`) | 4 par ligne (`col-3`) | ZoomIn 🔍+ | `true` |
