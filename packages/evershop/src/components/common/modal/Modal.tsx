import { Card } from '@components/admin/Card.js';
import React, { useEffect, useCallback, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  [key: string]: any;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  ...restProps
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setIsRendered(false);
    }
  };

  const handleModalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  useEffect(() => {
    if (isRendered) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isRendered]);

  useEffect(() => {
    if (!isRendered) return;
    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [isRendered, handleModalKeyDown]);

  if (!isRendered) {
    return null;
  }

  return (
    <>
      <div
        onClick={handleBackdropClick}
        role="presentation"
        className={`fixed inset-0 bg-black bg-opacity-50 z-1001 transition-opacity duration-300 z-30 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        onTransitionEnd={handleTransitionEnd}
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-50 w-full max-w-2xl max-h-[80vh] overflow-auto overscroll-contain transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${className || ''}`}
        {...restProps}
      >
        <Card title={title}>
          <Card.Session>{children}</Card.Session>
        </Card>
      </div>
    </>
  );
};
