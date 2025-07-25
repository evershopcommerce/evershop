import { Card } from '@components/admin/Card.js';
import Button from '@components/common/form/Button.js';
import React from 'react';
import './Alert.scss';

export interface ModalProps {
  modal: {
    state: {
      showing: boolean;
    };
    className: string;
    closeModal: () => void;
    onAnimationEnd: () => void;
  };
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    title: string;
    onAction: () => void;
  } | null;
}

const Modal: React.FC<ModalProps> = ({
  modal,
  title,
  children,
  primaryAction
}) => {
  if (modal.state.showing) {
    return (
      <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
        <div
          className="modal-wrapper flex self-center justify-center items-center"
          tabIndex={-1}
          role="dialog"
        >
          <div className="modal">
            <Card title={title}>
              <div className="modal-content">{children}</div>
              <Card.Session>
                <div className="flex justify-end gap-8">
                  <Button
                    title="Close"
                    variant="secondary"
                    onAction={modal.closeModal}
                  />
                  {primaryAction && (
                    <Button
                      title={primaryAction.title}
                      variant="primary"
                      onAction={primaryAction.onAction}
                    />
                  )}
                </div>
              </Card.Session>
            </Card>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
};

export { Modal };
