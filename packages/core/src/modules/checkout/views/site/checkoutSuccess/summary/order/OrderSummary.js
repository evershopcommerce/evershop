import React from 'react';
import { useAppState } from '../../../../../../../lib/context/app';
import { get } from '../../../../../../../lib/util/get';
import { Discount } from './Discount';
import { Shipping } from './Shipping';
import { Subtotal } from './Subtotal';
import { Tax } from './Tax';
import { Total } from './Total';

function OrderSummary() {
  const context = useAppState();
  const { order } = context;
  const { items } = order;
  const language = get(context, 'shop.language', 'en');
  const currency = get(context, 'shop.currency', 'usd');

  const formatedShippingCost = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.shipping_fee_excl_tax);
  const formatedTaxAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.tax_amount);
  const formatedDiscountAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.discount_amount);
  const formatedSubTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.sub_total);
  const formatedGrandTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.grand_total);

  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={parseFloat(formatedSubTotal)} />
      <Shipping method={order.shipping_method} cost={parseFloat(formatedShippingCost)} />
      <Tax taxClass="" amount={parseFloat(formatedTaxAmount)} />
      <Discount code="" amount={parseFloat(formatedDiscountAmount)} />
      <Total total={parseFloat(formatedGrandTotal)} />
    </div>
  );
}

export { OrderSummary };
