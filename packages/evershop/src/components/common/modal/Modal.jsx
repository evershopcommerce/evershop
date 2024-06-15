import { Card } from '@components/admin/cms/Card';
import React from 'react';
import PropTypes from 'prop-types';
import Button from '@components/common/form/Button';
import './Alert.scss';

function Modal({ modal, title, children, primaryAction }) {
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
                    onAction={modal.closeModal()}
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
  }
}

Modal.propTypes = {
  modal: PropTypes.shape({
    state: PropTypes.shape({
      showing: PropTypes.bool.isRequired
    }).isRequired,
    className: PropTypes.string.isRequired,
    closeModal: PropTypes.func.isRequired,
    onAnimationEnd: PropTypes.func.isRequired
  }).isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  primaryAction: PropTypes.shape({
    title: PropTypes.string.isRequired,
    onAction: PropTypes.func.isRequired
  })
};

Modal.defaultProps = {
  primaryAction: null
};

export default Modal;
