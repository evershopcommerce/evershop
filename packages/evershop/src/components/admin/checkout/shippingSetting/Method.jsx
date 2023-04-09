import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/common/modal/useModal';
import MethodForm from './MethodForm';

Method.propTypes = {};

function Method({ method, getZones }) {
  const modal = useModal();
  return (
    <Card.Session>
      <div>
        <div className="flex justify-start gap-2">
          <div>{method.name}</div>
          <div>{method.is_enabled ? 'Enabled' : 'Disabled'}</div>
        </div>
        <a
          href="#"
          className="text-interactive"
          onClick={(e) => {
            e.preventDefault();
            modal.openModal();
          }}
        >
          + Add Method
        </a>
      </div>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <MethodForm
                saveMethodApi={method.updateApi}
                closeModal={() => modal.closeModal()}
                getZones={getZones}
                method={method}
              />
            </div>
          </div>
        </div>
      )}
    </Card.Session>
  );
}

export default Method;
