import React from 'react';
import { Discount } from './cart/Discount';
import { Shipping } from './cart/Shipping';
import { Subtotal } from './cart/Subtotal';
import { Tax } from './cart/Tax';
import { Total } from './cart/Total';

function CartSummary({ totalQty, subTotal, grandTotal, discountAmount, taxAmount, shippingFeeExclTax, shippingMethod, coupon }) {
  return (
    <div className="checkout-summary-block">
      <Subtotal count={totalQty} total={subTotal.text} />
      <Shipping method={shippingMethod} cost={shippingFeeExclTax.text} />
      <Tax taxClass="" amount={taxAmount.text} />
      <Discount code={coupon} discount={discountAmount.text} />
      <Total total={grandTotal.text} />
    </div>
  );
}

export { CartSummary };
