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
    const galeries = screen.getByRole('link', { name: /Accéder aux galeries/i });
    expect(galeries).toHaveAttribute('href', '/galleries');
    expect(galeries).toHaveClass('pill-yellow');
    const yt = screen.getByRole('link', { name: /Chaîne Youtube/i });
    expect(yt.getAttribute('href')).toContain('youtube.com');
    expect(yt).toHaveClass('pill-white');
  });

  test('renders the animated scroll chevron as an accessible link', () => {
    render(<HomePage />);
    const chevron = screen.getByRole('link', { name: "Voir l'équipe" });
    expect(chevron).toHaveAttribute('href', '#team');
    expect(chevron).toHaveClass('scroll-chevron');
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
