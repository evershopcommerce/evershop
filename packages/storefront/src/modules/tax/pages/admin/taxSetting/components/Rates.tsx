import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { Rate, TaxRate } from './Rate.js';
import { RateForm } from './RateForm.js';

interface RatesProps {
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
  rates: Array<TaxRate>;
  addRateApi: string;
}
export function Rates({ getTaxClasses, rates, addRateApi }: RatesProps) {
  const modal = useModal();
  return (
    <div className="my-5">
      <table className="border-collapse divide-y">
        <thead>
          <tr>
            <th className="border-none">Name</th>
            <th className="border-none">Country</th>
            <th className="border-none">Rate</th>
            <th className="border-none">Compound</th>
            <th className="border-none">Priority</th>
            <th className="border-none">Action</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <tr key={rate.uuid} className="border-divider py-5">
              <Rate rate={rate} getTaxClasses={getTaxClasses} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">
        <a
          href="#"
          className="text-interactive"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
        >
          + Add Rate
        </a>
      </div>
      <Modal title="Add a tax rate" onClose={modal.close} isOpen={modal.isOpen}>
        <RateForm
          saveRateApi={addRateApi}
          closeModal={() => modal.close()}
          getTaxClasses={getTaxClasses}
        />
      </Modal>
    </div>
  );
}
