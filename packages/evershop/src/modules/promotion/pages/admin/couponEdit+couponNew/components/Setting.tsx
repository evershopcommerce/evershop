import { DateField } from '@components/common/form/DateField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';

export const Setting: React.FC<{
  discountAmount?: number;
  startDate?: string;
  endDate?: string;
}> = ({ discountAmount, startDate, endDate }) => {
  return (
    <div className="grid grid-cols-3 gap-5 form-field-container">
      <div>
        <NumberField
          name="discount_amount"
          defaultValue={discountAmount}
          placeholder="Discount amount"
          required
          label="Discount amount"
          validation={{
            required: 'Discount amount is required'
          }}
        />
      </div>
      <div>
        <DateField
          name="start_date"
          label="Start date"
          placeholder="Start date"
          defaultValue={startDate}
        />
      </div>
      <div>
        <DateField
          placeholder="End date"
          name="end_date"
          label="End date"
          defaultValue={endDate}
        />
      </div>
    </div>
  );
};
