import React from 'react';
import { Discount } from './Discount';
import { Shipping } from './Shipping';
import { Subtotal } from './Subtotal';
import { Tax } from './Tax';
import { Total } from './Total';

function OrderSummary({ items, subTotal, shippingMethod, shippingFeeExclTax, taxAmount, discountAmount, grandTotal }) {
  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={subTotal.text} />
      <Shipping method={shippingMethod} cost={shippingFeeExclTax.text} />
      <Tax taxClass="" amount={taxAmount.text} />
      <Discount code="" amount={discountAmount.text} />
      <Total total={grandTotal.text} />
    </div>
  );
}

export { OrderSummary };
