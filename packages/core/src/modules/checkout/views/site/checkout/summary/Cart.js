import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Discount } from './cart/Discount';
import { Shipping } from './cart/Shipping';
import { Subtotal } from './cart/Subtotal';
import { Tax } from './cart/Tax';
import { Total } from './cart/Total';

function CartSummary() {
  const context = useAppState();
  const { cart } = context;
  const { items } = cart;
  const language = get(context, 'shop.language', 'en');
  const currency = get(context, 'shop.currency', 'usd');

  const formatedShippingCost = new Intl.NumberFormat(language, { style: 'currency', currency }).format(cart.shipping_fee_excl_tax);
  const formatedTaxAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(cart.tax_amount);
  const formatedDiscountAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(cart.discount_amount);
  const formatedSubTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(cart.sub_total);
  const formatedGrandTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(cart.grand_total);

  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={formatedSubTotal} />
      <Shipping method={cart.shipping_method} cost={formatedShippingCost} />
      <Tax taxClass="" amount={formatedTaxAmount} />
      <Discount code="" amount={formatedDiscountAmount} />
      <Total total={formatedGrandTotal} />
    </div>
  );
}

export { CartSummary };
