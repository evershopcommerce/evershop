import { DateField } from '@components/common/form/DateField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
          placeholder={_('Discount amount')}
          required
          label={_('Discount amount')}
          validation={{
            required: _('Discount amount is required')
          }}
        />
      </div>
      <div>
        <DateField
          name="start_date"
          label={_('Start date')}
          placeholder={_('Start date')}
          defaultValue={startDate}
        />
      </div>
      <div>
        <DateField
          placeholder={_('End date')}
          name="end_date"
          label={_('End date')}
          defaultValue={endDate}
        />
      </div>
    </div>
  );
};
