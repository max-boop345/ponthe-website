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
      const errorEl = screen.getByText("Le fichier envoyé n'est pas un zip valide.");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveAttribute('role', 'alert');
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

    try {
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

      // Le modal est fermé
      expect(screen.queryByText("Lancer l'envoi")).not.toBeInTheDocument();
    } finally {
      window.location = originalLocation;
    }
  });

  test('upload button is disabled while uploading', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: jest.fn() };

    try {
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

      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    } finally {
      window.location = originalLocation;
    }
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

  test('upload modal shows generic error when response is not JSON', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/gestion/gallery/') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: () => Promise.reject(new Error('Unexpected token < in JSON')),
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
      expect(screen.getByText("Une erreur est survenue lors de l'envoi.")).toBeInTheDocument();
    });
  });

  test('reopening the modal clears the previously selected file', async () => {
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

    // Open modal, select a file, trigger an error
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

    // Close and reopen — the file input is fresh and empty
    fireEvent.click(document.querySelector('.close-white-modal'));
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText("Lancer l'envoi")).toBeInTheDocument();
    });
    expect(document.querySelector('input[type="file"]').value).toBe('');

    // Submitting without a new selection asks for a file
    fireEvent.click(screen.getByText("Lancer l'envoi"));
    await waitFor(() => {
      expect(screen.getByText(/sélectionn/i)).toBeInTheDocument();
    });
  });

  // --- Contrats CSS (TODO #8) ---

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

  test('App.css defines the .upload-error rule', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
    expect(css).toMatch(/\.upload-error\s*\{/);
  });
});

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
    fireEvent.click(screen.getByTitle('Vue dézoomée'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });
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
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[0]);
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
    fireEvent.click(screen.getByTitle('Vue dézoomée'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByTestId('gallery-sticker')[1]);
    await waitFor(() => {
      const modalImg = document.querySelector('.img-modal');
      expect(modalImg).toBeInTheDocument();
      expect(modalImg).toHaveAttribute('src', '/media/test-gallery/uploads/photo2.jpg');
    });
  });

  test('toggle button preserves other toolbar elements (add, delete, selects)', async () => {
    const { container } = render(<GestionGallery />);
    await waitFor(() => {
      // MUI Select renders with aria-haspopup="listbox", not role="combobox"
      const selects = container.querySelectorAll('[aria-haspopup="listbox"]');
      expect(selects.length).toBe(2);
    });
  });

  test('does not re-fetch pics when toggling zoom', async () => {
    render(<GestionGallery />);
    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-sticker').length).toBe(2);
    });
    const picsFetchCallsBefore = global.fetch.mock.calls.filter(
      call => call[0].includes('/api/gallery/pics/')
    ).length;
    fireEvent.click(screen.getByTitle('Vue dézoomée'));
    await waitFor(() => {
      expect(screen.getByTitle('Vue normale')).toBeInTheDocument();
    });
    const picsFetchCallsAfter = global.fetch.mock.calls.filter(
      call => call[0].includes('/api/gallery/pics/')
    ).length;
    expect(picsFetchCallsAfter).toBe(picsFetchCallsBefore);
  });
});

const REPORTS = [
    {
        id: 1,
        file_full_name: 'picture.jpg',
        reporter_name: 'student',
        category: 'inapproprié',
        message: 'problème',
        created_at: '2026-10-08T12:00:00Z',
    },
];

describe('GestionGallery reports', () => {
    beforeEach(() => {
        window.gallery_slug = 'gallery';
        window.is_staff = false;
        window.is_superuser = false;
        window.is_authenticated = true;
        window.alert = jest.fn();
        window.fetch = jest.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        );
    });

    test('clicking the flag icon fetches and shows the reports', async () => {
        window.fetch = jest.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve(REPORTS) })
        );
        render(<GestionGallery />);
        fireEvent.click(screen.getByTitle('Signalements'));

        await waitFor(() =>
            expect(window.fetch).toHaveBeenCalledWith(
                '/api/gallery/reports/',
                expect.objectContaining({ method: 'POST' })
            )
        );
        expect(await screen.findByText('picture.jpg')).toBeInTheDocument();
        expect(screen.getByText('student')).toBeInTheDocument();
    });

    test('empty gallery shows the empty state', async () => {
        render(<GestionGallery />);
        fireEvent.click(screen.getByTitle('Signalements'));
        expect(
            await screen.findByText('Aucun signalement sur cette galerie.')
        ).toBeInTheDocument();
    });

    test('an error response does not crash and keeps the modal closed', async () => {
        window.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 403,
                json: () => Promise.resolve({ detail: 'authentication credentials were not provided.' }),
            })
        );
        render(<GestionGallery />);
        fireEvent.click(screen.getByTitle('Signalements'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        // Le modal ne s'est pas ouvert : aucun titre Signalements de modal ni crash du rendu.
        expect(screen.queryByRole('heading', { name: 'Signalements' })).not.toBeInTheDocument();
        expect(window.alert).toHaveBeenCalled();
    });
});
