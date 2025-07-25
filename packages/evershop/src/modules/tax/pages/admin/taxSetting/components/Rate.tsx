import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { RateForm } from './RateForm.js';

interface RateProps {
  rate: {
    uuid: string;
    name: string;
    isCompound: boolean;
    rate: number;
    priority: number;
    country: string;
    province: string;
    postcode: string;
    updateApi: string;
    deleteApi: string;
  };
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void>;
}

function Rate({ rate, getTaxClasses }: RateProps) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-4">{rate.name}</td>
        <td className="border-none py-4">{rate.rate}%</td>
        <td className="border-none py-4">{rate.isCompound ? 'Yes' : 'No'}</td>
        <td className="border-none py-4">{rate.priority}</td>
        <td className="border-none py-4">
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
            className="text-critical ml-8"
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
      <modal.Content title="Edit tax rate">
        <RateForm
          saveRateApi={rate.updateApi}
          closeModal={() => modal.close()}
          getTaxClasses={getTaxClasses}
          rate={rate}
        />
      </modal.Content>
    </>
  );
}

export { Rate };
