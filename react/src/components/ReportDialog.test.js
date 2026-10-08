import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ReportDialog from './ReportDialog';

describe('ReportDialog', () => {
  test('renders the four categories with "Autre" checked by default', () => {
    render(<ReportDialog open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Autre')).toBeChecked();
    expect(screen.getByLabelText('Contenu inapproprié')).not.toBeChecked();
    expect(screen.getByLabelText('Hors sujet')).not.toBeChecked();
    expect(screen.getByLabelText('Problème de qualité')).not.toBeChecked();
  });

  test('message field is optional and starts empty', () => {
    render(<ReportDialog open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/message/i)).toHaveValue('');
  });

  test('submit passes the chosen category and message, then closes', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    render(<ReportDialog open={true} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Hors sujet'));
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'photo floue' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Signaler' }));

    expect(onSubmit).toHaveBeenCalledWith('hors sujet', 'photo floue');
    expect(onClose).toHaveBeenCalled();
  });

  test('cancel closes without submitting', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    render(<ReportDialog open={true} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
