import PropTypes from "prop-types"
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { Toggle } from '../../../../../lib/components/form/fields/Toggle';
import { useAppState } from '../../../../../lib/context/app';
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
          formId="coupon-edit-form"
          label="Start date"
          value={startDate}
        />
      </div>
      <div>
        <Field
          type='date'
          name="end_date"
          formId="coupon-edit-form"
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

export default function General() {
  const context = useAppState();
  return (
    <Area
      id="couponFormGeneral"
      coreComponents={[
        {
          component: { default: Field },
          props: {
            name: 'coupon',
            value: get(context, 'coupon.coupon'),
            validationRules: ['notEmpty'],
            type: 'text',
            label: 'Coupon code'
          },
          sortOrder: 10,
          id: 'couponCoupon'
        },
        {
          component: { default: Field },
          props: {
            name: 'description',
            value: get(context, 'coupon.description'),
            type: 'textarea',
            label: 'Description',
            validationRules: ['notEmpty']
          },
          sortOrder: 20,
          id: 'couponDescription'
        },
        {
          component: { default: Toggle },
          props: {
            name: 'status',
            value: get(context, 'coupon.status', 1).toString(),
            validationRules: ['notEmpty'],
            label: 'Status'
          },
          sortOrder: 30,
          id: 'couponStatus'
        },
        {
          component: { default: Setting },
          props: {
            startDate: get(context, 'coupon.start_date', ''),
            endDate: get(context, 'coupon.end_date', ''),
            discountAmount: get(context, 'coupon.discount_amount')
          },
          sortOrder: 40,
          id: 'startEnd'
        },
        {
          component: { default: Field },
          props: {
            name: 'free_shipping',
            value: 1,
            type: 'checkbox',
            label: 'Free shipping?',
            isChecked: get(context, 'coupon.free_shipping') == 1
          },
          sortOrder: 50,
          id: 'couponFreeShipping'
        }
      ]}
    />
  );
}