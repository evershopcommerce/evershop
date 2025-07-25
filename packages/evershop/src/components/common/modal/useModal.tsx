import { Card } from '@components/admin/Card.js';
import React, { useCallback, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

export interface UseModalOptions {
  initialOpen?: boolean;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: (e?: React.SyntheticEvent) => void;
  toggle: (e?: React.SyntheticEvent) => void;
  Content: React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      title?: React.ReactNode;
    }
  >;
}

export function useModal({
  initialOpen = false,
  onAfterOpen,
  onAfterClose,
  closeOnEscape = true,
  closeOnBackdropClick = true
}: UseModalOptions = {}): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    if (onAfterOpen) onAfterOpen();
  }, [onAfterOpen]);

  const close = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsOpen(false);
      if (onAfterClose) onAfterClose();
    },
    [onAfterClose]
  );

  const toggle = useCallback(
    (e?: React.SyntheticEvent) => {
      if (isOpen) {
        close(e);
      } else {
        open();
      }
    },
    [isOpen, open, close]
  );

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const Content = useCallback(
    ({ children, className, title, ...restProps }) => {
      if (!isOpen) return null;

      const handleModalKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          close(e);
        }
      };

      const handleBackdropClick = (e: React.MouseEvent) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          close(e);
        }
      };

      const modalContent = (
        <>
          <div
            onClick={handleBackdropClick}
            role="presentation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => {}}
            onKeyDown={handleModalKeyDown}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 1002,
              width: '100%',
              maxWidth: '42rem',
              maxHeight: '80vh',
              overflow: 'auto',
              overscrollBehavior: 'contain'
            }}
            className={className || ''}
            {...restProps}
          >
            <Card title={title}>
              <div className="p-4">{children}</div>
            </Card>
          </div>
        </>
      );
      return ReactDOM.createPortal(modalContent, document.body);
    },
    [isOpen, close, closeOnEscape, closeOnBackdropClick]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    Content: Content as React.FC<
      React.HTMLAttributes<HTMLDivElement> & {
        title?: React.ReactNode;
      }
    >
  };
}
