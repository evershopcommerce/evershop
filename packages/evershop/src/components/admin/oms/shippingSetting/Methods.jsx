import React from 'react';
import PropTypes from 'prop-types';
import { useModal } from '@components/common/modal/useModal';
import Method from './Method';
import MethodForm from './MethodForm';

export function Methods({ getZones, methods, addMethodApi }) {
  const modal = useModal();
  return (
    <div className="my-2">
      <table className="border-collapse divide-y">
        <thead>
          <tr>
            <th className="border-none">Method</th>
            <th className="border-none">Status</th>
            <th className="border-none">Cost</th>
            <th className="border-none">Condition</th>
            <th className="border-none">Action</th>
          </tr>
        </thead>
        {methods.map((method) => (
          <tr key={method.methodId} className="border-divider py-2">
            <Method method={method} getZones={getZones} />
          </tr>
        ))}
      </table>
      <div className="mt-1">
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
                saveMethodApi={addMethodApi}
                closeModal={() => modal.closeModal()}
                getZones={getZones}
              />
            </div>
          </div>
        </div>
      )}
    </div>
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
  getZones: PropTypes.func.isRequired,
  addMethodApi: PropTypes.string.isRequired
};
