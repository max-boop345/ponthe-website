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
