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
});
