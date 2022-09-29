import React from 'react';
import { Input } from "../../../../../../lib/components/form/fields/Input";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { RequiredProducts } from './RequireProducts';

export function OrderCondition() {
  const condition = get(useAppState(), 'coupon.condition', {});
  return (
    <div>
      <Input
        name="condition[order_total]"
        label="Minimum purchase amount"
        value={condition.order_total ? condition.order_total : ''}
      />
      <Input
        name="condition[order_qty]"
        label="Minimum purchase qty"
        value={condition.order_qty ? condition.order_qty : ''}
      />
      <RequiredProducts requiredProducts={condition.required_products ? condition.required_products : []} />
    </div>
  );
}
