import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import GestionGallery from './GestionGallery';

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
        window.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve([]) })
        );
    });

    test('clicking the flag icon fetches and shows the reports', async () => {
        window.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve(REPORTS) })
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
});
