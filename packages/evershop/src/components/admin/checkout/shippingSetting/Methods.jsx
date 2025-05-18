import Method from '@components/admin/checkout/shippingSetting/Method';
import MethodForm from '@components/admin/checkout/shippingSetting/MethodForm';
import { useModal } from '@components/common/modal/useModal';
import PropTypes from 'prop-types';
import React from 'react';

export function Methods({ getZones, methods, addMethodApi }) {
  const modal = useModal();
  return (
    <div className="my-8">
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
        <tbody>
          {methods.map((method) => (
            <tr key={method.methodId} className="border-divider py-8">
              <Method method={method} getZones={getZones} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
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
      cost: PropTypes.shape({
        value: PropTypes.number
      })
    })
  ).isRequired,
  getZones: PropTypes.func.isRequired,
  addMethodApi: PropTypes.string.isRequired
};
