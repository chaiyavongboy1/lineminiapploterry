'use client';

import { useEffect, useCallback, ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, children, title, size = 'md' }: ModalProps) {
    const [mounted, setMounted] = useState(false);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !mounted) return null;

    const widthMap = {
        sm: 340,
        md: 420,
        lg: 480,
    };

    const modalContent = (
        <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`modal-content slide-up ${size === 'lg' ? 'modal-lg' : ''}`}
                style={{ maxWidth: widthMap[size] }}
            >
                <div className="modal-handle" />
                {title && (
                    <div className="modal-header">
                        <h3 className="modal-title">{title}</h3>
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            ✕
                        </button>
                    </div>
                )}
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );

    // Use React Portal to render directly on document.body
    // This escapes any parent stacking context issues
    return createPortal(modalContent, document.body);
}
