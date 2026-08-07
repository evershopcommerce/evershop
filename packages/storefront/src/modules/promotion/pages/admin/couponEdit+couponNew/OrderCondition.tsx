import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';
import {
  RequiredProduct,
  RequiredProducts
} from './components/RequireProducts.js';

interface OrderConditionProps {
  coupon?: {
    condition?: {
      orderTotal?: number;
      orderQty?: number;
      requiredProducts?: RequiredProduct[];
    };
  };
}
export default function OrderCondition({ coupon = {} }: OrderConditionProps) {
  const condition = coupon?.condition || {};

  return (
    <div className="space-y-2">
      <NumberField
        name="condition.order_total"
        label="Minimum purchase amount"
        placeholder="Minimum purchase amount"
        defaultValue={condition.orderTotal || 0}
        helperText="The minimum total amount required for the order to qualify for this coupon."
      />

      <NumberField
        name="condition.order_qty"
        label="Minimum purchase qty"
        placeholder="Minimum purchase quantity"
        defaultValue={condition.orderQty || 0}
        helperText="The minimum quantity of items required in the order to qualify for this coupon."
        allowDecimals={false}
        min={0}
      />
      <RequiredProducts requiredProducts={condition.requiredProducts || []} />
    </div>
  );
}

export const layout = {
  areaId: 'couponEditLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      condition {
        orderTotal
        orderQty
        requiredProducts {
          key
          operator
          value
          qty
        }
      }
    }
  }
`;
