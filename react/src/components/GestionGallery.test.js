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
});
