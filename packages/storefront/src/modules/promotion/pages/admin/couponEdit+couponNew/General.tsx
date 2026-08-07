import Area from '@components/common/Area.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';
import { Setting } from './components/Setting.js';
import './General.scss';

export interface Coupon {
  coupon: string;
  status: number;
  description: string;
  discountAmount: number;
  freeShipping: number;
  startDate: { text: string; value: string };
  endDate: { text: string; value: string };
  targetProducts?: {
    products: { productId: number; productName: string }[];
    maxQty: number;
  };
  buyxGety?: {
    items: {
      productId: number;
      productName: string;
      qty: number;
      discount: number;
    }[];
  };
  discountType?: string;
  condition?: {
    orderTotal?: number;
    orderQty?: number;
    requiredProducts?: {
      key: string;
      operator: string;
      value: string;
      qty: number;
    }[];
  };
  userCondition?: {
    groups?: number[] | string[];
    emails?: string[];
    purchased: number;
  };
}

export default function General({ coupon }: { coupon?: Coupon }) {
  return (
    <Area
      id="couponFormGeneral"
      coreComponents={[
        {
          component: {
            default: (
              <InputField
                name="coupon"
                label="Coupon Code"
                defaultValue={coupon?.coupon || ''}
                placeholder="Enter coupon code"
                required
                validation={{
                  required: 'Coupon code is required',
                  pattern: {
                    value: /^[a-zA-Z0-9_-]+$/,
                    message:
                      'Coupon code can only contain letters, numbers, underscores, and hyphens'
                  }
                }}
              />
            )
          },
          sortOrder: 10
        },
        {
          component: {
            default: (
              <TextareaField
                name="description"
                label="Description"
                defaultValue={coupon?.description || ''}
                placeholder="Enter description"
                required
                validation={{
                  required: 'Description is required'
                }}
              />
            )
          },
          sortOrder: 20
        },
        {
          component: {
            default: (
              <RadioGroupField
                name="status"
                label="Status"
                options={[
                  { label: 'Enabled', value: 1 },
                  { label: 'Disabled', value: 0 }
                ]}
                defaultValue={coupon?.status === 0 ? 0 : 1}
                required
                validation={{
                  required: 'Status is required',
                  valueAsNumber: true
                }}
              />
            )
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
          component: {
            default: (
              <CheckboxField
                name="free_shipping"
                defaultValue={parseInt(get(coupon, 'freeShipping'), 10) === 1}
                label="Free shipping?"
              />
            )
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
