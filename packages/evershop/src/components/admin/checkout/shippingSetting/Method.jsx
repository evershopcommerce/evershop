import MethodForm from '@components/admin/checkout/shippingSetting/MethodForm';
import { useModal } from '@components/common/modal/useModal';
import CogIcon from '@heroicons/react/outline/CogIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

function Method({ method, getZones }) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-4">{method.name}</td>
        <td className="border-none py-4">
          {method.isEnabled ? 'Enabled' : 'Disabled'}
        </td>
        <td className="border-none py-4">
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
        <td className="border-none py-4">
          {method.conditionType
            ? `${method.min || 0} <= ${method.conditionType} <= ${
                method.max || '∞'
              }`
            : 'None'}
        </td>
        <td className="border-none py-4">
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
          <a
            href="#"
            className="text-critical ml-8"
            onClick={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(method.deleteApi, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include'
                });
                if (response.ok) {
                  await getZones();
                  // Toast success
                  toast.success('Method removed successfully');
                } else {
                  // Toast error
                  toast.error('Failed to remove method');
                }
              } catch (error) {
                // Toast error
                toast.error('Failed to remove method');
              }
            }}
          >
            Delete
          </a>
        </td>
      </>
      {modal.state.showing && (
        <td className="border-none w-0 h-0">
          <div
            className={modal.className}
            onAnimationEnd={modal.onAnimationEnd}
          >
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
        </td>
      )}
    </>
  );
}

Method.propTypes = {
  method: PropTypes.shape({
    name: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    cost: PropTypes.shape({
      text: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired
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
    conditionType: PropTypes.string,
    min: PropTypes.number,
    max: PropTypes.number,
    updateApi: PropTypes.string.isRequired,
    deleteApi: PropTypes.string.isRequired
  }),
  getZones: PropTypes.func.isRequired
};

Method.defaultProps = {
  method: {
    cost: {
      text: ''
    },
    priceBasedCost: [],
    weightBasedCost: [],
    conditionType: null,
    min: null,
    max: null
  }
};

export default Method;
