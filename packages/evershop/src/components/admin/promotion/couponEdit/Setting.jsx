import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';

export function Setting({ discountAmount, startDate = '', endDate = '' }) {
  return (
    <div className="grid grid-cols-3 gap-2 form-field-container">
      <div>
        <Field
          type="text"
          name="discount_amount"
          value={discountAmount}
          validationRules={['notEmpty']}
          label="Discount amount"
        />
      </div>
      <div>
        <Field
          type="date"
          name="start_date"
          label="Start date"
          value={startDate}
        />
      </div>
      <div>
        <Field type="date" name="end_date" label="End date" value={endDate} />
      </div>
    </div>
  );
}

Setting.propTypes = {
  discountAmount: PropTypes.number,
  endDate: PropTypes.string,
  startDate: PropTypes.string
};

Setting.defaultProps = {
  discountAmount: 0,
  endDate: '',
  startDate: ''
};
