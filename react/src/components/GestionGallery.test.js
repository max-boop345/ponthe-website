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
});
