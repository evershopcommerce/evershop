import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import { CogIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { toast } from 'react-toastify';
import { MethodForm } from './MethodForm.js';

export interface ShippingMethod {
  methodId: string;
  uuid: string;
  name: string;
  isEnabled: boolean;
  cost?: {
    text: string;
    value: number;
  };
  priceBasedCost?: Array<{
    minPrice: { value: number; text: string };
    cost: { value: number; text: string };
  }>;
  weightBasedCost?: Array<{
    minWeight: { value: number; text: string };
    cost: { value: number; text: string };
  }>;
  calculateApi?: string;
  conditionType?: string;
  min?: number;
  max?: number;
  updateApi: string;
  deleteApi: string;
}
export interface MethodProps {
  method: ShippingMethod;
  reload: () => void;
}

function Method({ method, reload }: MethodProps) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-2">{method.name}</td>
        <td className="border-none py-2">
          {method.isEnabled ? 'Enabled' : 'Disabled'}
        </td>
        <td className="border-none py-2">
          {method.cost?.text || (
            <a
              href="#"
              className="text-interactive"
              onClick={(e) => {
                e.preventDefault();
                modal.open();
              }}
            >
              <CogIcon width={22} height={22} />
            </a>
          )}
        </td>
        <td className="border-none py-2">
          {method.conditionType
            ? `${method.min || 0} <= ${method.conditionType} <= ${
                method.max || '∞'
              }`
            : 'None'}
        </td>
        <td className="border-none py-2">
          <a
            href="#"
            className="text-interactive"
            onClick={(e) => {
              e.preventDefault();
              modal.open();
            }}
          >
            Edit
          </a>
          <a
            href="#"
            className="text-critical ml-5"
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
                  reload();
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
      <Modal
        title={`Edit ${method.name} Method`}
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <MethodForm
          saveMethodApi={method.updateApi}
          onSuccess={() => modal.close()}
          reload={reload}
          method={method}
        />
      </Modal>
    </>
  );
}

export { Method };
