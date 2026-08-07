import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { RateForm } from './RateForm.js';

export interface TaxRate {
  uuid: string;
  name: string;
  rate: number;
  isCompound: boolean;
  priority: number;
  country: string;
  province: string;
  postcode: string;
  updateApi: string;
  deleteApi: string;
}
interface RateProps {
  rate: TaxRate;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
}

function Rate({ rate, getTaxClasses }: RateProps) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-2 w-1/5">{rate.name}</td>
        <td className="border-none py-2">{rate.country}</td>
        <td className="border-none py-2">{rate.rate}%</td>
        <td className="border-none py-2">{rate.isCompound ? 'Yes' : 'No'}</td>
        <td className="border-none py-2">{rate.priority}</td>
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
              await fetch(rate.deleteApi, {
                method: 'DELETE'
              });
              await getTaxClasses({ requestPolicy: 'network-only' });
            }}
          >
            Delete
          </a>
        </td>
      </>
      <Modal title="Edit tax rate" onClose={modal.close} isOpen={modal.isOpen}>
        <RateForm
          saveRateApi={rate.updateApi}
          closeModal={() => modal.close()}
          getTaxClasses={getTaxClasses}
          rate={rate}
        />
      </Modal>
    </>
  );
}

export { Rate };
