import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

// Les valeurs doivent rester identiques à Report.Category dans back/api/models.py.
const CATEGORIES = [
    { value: 'inapproprié', label: 'Contenu inapproprié' },
    { value: 'hors sujet', label: 'Hors sujet' },
    { value: 'qualité', label: 'Problème de qualité' },
    { value: 'autre', label: 'Autre' },
];

export default function ReportDialog({ open, onClose, onSubmit }) {
    const [category, setCategory] = useState('autre');
    const [message, setMessage] = useState('');

    const submit = () => {
        onSubmit(category, message);
        setMessage('');
        onClose();
    };

    return (
        <Modal show={open} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Signaler cette photo</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {CATEGORIES.map((c) => (
                        <Form.Check
                            key={c.value}
                            type="radio"
                            id={"report-category-" + c.value}
                            name="report-category"
                            label={c.label}
                            checked={category === c.value}
                            onChange={() => setCategory(c.value)}
                        />
                    ))}
                    <Form.Group controlId="report-message" className="mt-3">
                        <Form.Label>Message (optionnel)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            maxLength={1000}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Annuler</Button>
                <Button variant="danger" onClick={submit}>Signaler</Button>
            </Modal.Footer>
        </Modal>
    );
}
