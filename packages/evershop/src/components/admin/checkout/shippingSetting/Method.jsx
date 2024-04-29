import React from 'react';
import PropTypes from 'prop-types';
import CogIcon from '@heroicons/react/outline/CogIcon';
import { useModal } from '@components/common/modal/useModal';
import MethodForm from '@components/admin/checkout/shippingSetting/MethodForm';

function Method({ method, getZones }) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-1">{method.name}</td>
        <td className="border-none py-1">
          {method.isEnabled ? 'Enabled' : 'Disabled'}
        </td>
        <td className="border-none py-1">
          {method.cost?.text || (
            <a
              href="#"
              className="text-interactive"
              onClick={(e) => {
                e.preventDefault();
                modal.openModal();
              }}
            >
              <CogIcon width={22} height={22} />
            </a>
          )}
        </td>
        <td className="border-none py-1">
          {method.conditionType
            ? `${method.min || 0} <= ${method.conditionType} <= ${
                method.max || '∞'
              }`
            : 'None'}
        </td>
        <td className="border-none py-1">
          <a
            href="#"
            className="text-interactive"
            onClick={(e) => {
              e.preventDefault();
              modal.openModal();
            }}
          >
            Edit
          </a>
        </td>
      </>
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
    </>
  );
}

Method.propTypes = {
  method: PropTypes.shape({
    name: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    cost: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    priceBasedCost: PropTypes.arrayOf(
      PropTypes.shape({
        minPrice: PropTypes.number.isRequired,
        cost: PropTypes.number.isRequired
      })
    ),
    weightBasedCost: PropTypes.arrayOf(
      PropTypes.shape({
        minWeight: PropTypes.number.isRequired,
        cost: PropTypes.number.isRequired
      })
    ),
    conditionType: PropTypes.string.isRequired,
    min: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    updateApi: PropTypes.string.isRequired
  }).isRequired,
  getZones: PropTypes.func.isRequired
};

export default Method;
