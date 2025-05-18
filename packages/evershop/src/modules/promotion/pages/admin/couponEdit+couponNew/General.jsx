import { Setting } from '@components/admin/promotion/couponEdit/Setting';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Toggle } from '@components/common/form/fields/Toggle';
import PropTypes from 'prop-types';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';


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
            label: 'Coupon code',
            placeholder: 'Enter coupon code'
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
            validationRules: ['notEmpty'],
            placeholder: 'Enter description'
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
            startDate: get(coupon, 'startDate.text', ''),
            endDate: get(coupon, 'endDate.text', ''),
            discountAmount: get(coupon, 'discountAmount', '')
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
            isChecked: parseInt(get(coupon, 'freeShipping'), 10) === 1
          },
          sortOrder: 50
        }
      ]}
    />
  );
}

General.propTypes = {
  coupon: PropTypes.shape({
    coupon: PropTypes.string,
    status: PropTypes.number,
    description: PropTypes.string,
    discountAmount: PropTypes.number,
    freeShipping: PropTypes.number,
    startDate: PropTypes.shape({ text: PropTypes.string }),
    endDate: PropTypes.shape({ text: PropTypes.string })
  })
};

General.defaultProps = {
  coupon: {}
};

export const layout = {
  areaId: 'couponEditGeneral',
  sortOrder: 10
};

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      coupon
      status
      description
      discountAmount
      freeShipping
      startDate {
        text
      }
      endDate {
        text
      }
    }
  }
`;
