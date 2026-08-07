import { useState, useCallback } from 'react';

export interface UseModalOptions {
  initialOpen?: boolean;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: (e?: React.SyntheticEvent) => void;
  toggle: (e?: React.SyntheticEvent) => void;
}

export function useModal({
  initialOpen = false,
  onAfterOpen,
  onAfterClose
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

  return {
    isOpen,
    open,
    close,
    toggle
  };
}
