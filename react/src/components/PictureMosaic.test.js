import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import PictureMosaic from './PictureMosaic';

const PICS = [
    {
        id: 1,
        file_name: 'picture',
        file_extension: 'jpg',
        file_full_name: 'picture.jpg',
        gallery: 1,
        link: '/media/gallery',
    },
];

function renderMosaic(authenticated) {
    window.is_authenticated = authenticated;
    window.gallery_slug = 'gallery';
    return render(<PictureMosaic result={PICS} />);
}

describe('PictureMosaic report button', () => {
    test('no report button when not authenticated', () => {
        const { container } = renderMosaic(false);
        fireEvent.click(container.querySelector('.gallery-sticker'));
        expect(container.querySelector('.report-flag')).not.toBeInTheDocument();
    });

    test('report button opens the dialog when authenticated', () => {
        const { container } = renderMosaic(true);
        fireEvent.click(container.querySelector('.gallery-sticker'));
        fireEvent.click(container.querySelector('.report-flag'));
        expect(screen.getByText('Signaler cette photo')).toBeInTheDocument();
    });

    test('submitting the dialog calls the report API', async () => {
        const fetchMock = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })
        );
        window.fetch = fetchMock;
        window.alert = jest.fn();

        const { container } = renderMosaic(true);
        fireEvent.click(container.querySelector('.gallery-sticker'));
        fireEvent.click(container.querySelector('.report-flag'));
        fireEvent.click(screen.getByLabelText('Hors sujet'));
        fireEvent.change(screen.getByLabelText(/message/i), {
            target: { value: 'photo floue' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Signaler' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/gallery/pics/report/');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({
            slug: 'gallery',
            file_full_name: 'picture.jpg',
            category: 'hors sujet',
            message: 'photo floue',
        });
    });

    test('clicking outside the picture closes the modal for anonymous users', () => {
        const { container } = renderMosaic(false);
        fireEvent.click(container.querySelector('.gallery-sticker'));
        expect(container.querySelector('.img-modal')).toBeInTheDocument();
        fireEvent.click(document.body);
        expect(container.querySelector('.img-modal')).not.toBeInTheDocument();
    });

    test('arrow keys while the report dialog is open do not change the reported photo', async () => {
        const PICS2 = [
            {
                id: 1,
                file_name: 'picture',
                file_extension: 'jpg',
                file_full_name: 'picture.jpg',
                gallery: 1,
                link: '/media/gallery',
            },
            {
                id: 2,
                file_name: 'picture2',
                file_extension: 'jpg',
                file_full_name: 'picture2.jpg',
                gallery: 1,
                link: '/media/gallery',
            },
        ];
        const fetchMock = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })
        );
        window.fetch = fetchMock;
        window.alert = jest.fn();
        window.is_authenticated = true;
        window.gallery_slug = 'gallery';

        const { container } = render(<PictureMosaic result={PICS2} />);
        fireEvent.click(container.querySelector('.gallery-sticker'));
        fireEvent.click(container.querySelector('.report-flag'));
        fireEvent.keyDown(document, { key: 'ArrowRight' });
        fireEvent.click(screen.getByLabelText('Hors sujet'));
        fireEvent.click(screen.getByRole('button', { name: 'Signaler' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const [url, options] = fetchMock.mock.calls[0];
        expect(JSON.parse(options.body).file_full_name).toBe('picture.jpg');
    });
});
