import PropTypes from 'prop-types'
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { Toggle } from '../../../../../lib/components/form/fields/Toggle';
import { get } from '../../../../../lib/util/get';

function Setting({ discountAmount, startDate = '', endDate = '' }) {
  return (
    <div className="grid grid-cols-3 gap-2 form-field-container">
      <div>
        <Field
          type='text'
          name='discount_amount'
          value={discountAmount}
          validationRules={['notEmpty']}
          label='Discount amount'
        />
      </div>
      <div>
        <Field
          type='date'
          name="start_date"
          label="Start date"
          value={startDate}
        />
      </div>
      <div>
        <Field
          type='date'
          name="end_date"
          label="End date"
          value={endDate}
        />
      </div>
    </div>
  );
}

Setting.propTypes = {
  discountAmount: PropTypes.number,
  endDate: PropTypes.string,
  startDate: PropTypes.string
}

export default function General({ coupon = {} }) {
  return (
    <Area
      id="couponFormGeneral"
      coreComponents={[
        {
          component: { default: Field },
          props: {
            name: 'coupon',
            value: get(coupon, 'coupon'),
            validationRules: ['notEmpty'],
            type: 'text',
            label: 'Coupon code'
          },
          sortOrder: 10
        },
        {
          component: { default: Field },
          props: {
            name: 'description',
            value: get(coupon, 'description'),
            type: 'textarea',
            label: 'Description',
            validationRules: ['notEmpty']
          },
          sortOrder: 20
        },
        {
          component: { default: Toggle },
          props: {
            name: 'status',
            value: get(coupon, 'status', 1).toString(),
            validationRules: ['notEmpty'],
            label: 'Status'
          },
          sortOrder: 30
        },
        {
          component: { default: Setting },
          props: {
            startDate: get(coupon, 'startDate', ''),
            endDate: get(coupon, 'endDate', ''),
            discountAmount: get(coupon, 'discountAmount')
          },
          sortOrder: 40
        },
        {
          component: { default: Field },
          props: {
            name: 'free_shipping',
            value: 1,
            type: 'checkbox',
            label: 'Free shipping?',
            isChecked: get(coupon, 'freeShipping') == 1
          },
          sortOrder: 50
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'couponEditGeneral',
  sortOrder: 10
}

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      coupon
      status
      description
      discountAmount
      freeShipping
      startDate
      endDate
    }
  }
`;