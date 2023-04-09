import React from 'react';
import PropTypes from 'prop-types';
import Method from './Method';
import { useModal } from '@components/common/modal/useModal';
import MethodForm from './MethodForm';

export function Methods({ getZones, methods, addMethodApi }) {
  const modal = useModal();
  return (
    <>
      {methods.map((method) => {
        return <Method method={method} getZones={getZones} />;
      })}
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
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <MethodForm
                saveMethodApi={addMethodApi}
                closeModal={() => modal.closeModal()}
                getZones={getZones}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Methods.propTypes = {
  methods: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      cost: PropTypes.string.isRequired
    })
  ).isRequired,
  getZones: PropTypes.func.isRequired
};
