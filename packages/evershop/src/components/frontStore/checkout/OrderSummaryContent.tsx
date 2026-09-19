import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartSummaryItemsList } from '@components/frontStore/cart/CartSummaryItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import React from 'react';

/**
 * Items and totals of the checkout order summary. Rendered by the summary
 * rail block (`checkout/CheckoutSummary`) and by the checkout shell's mobile
 * disclosure bar. Was a local function of `Checkout.tsx`.
 */
export function OrderSummaryContent() {
  return (
    <>
      <CartItems>
        {({ items, loading, showPriceIncludingTax }) => (
          <CartSummaryItemsList
            items={items}
            loading={loading}
            showPriceIncludingTax={showPriceIncludingTax}
          />
        )}
      </CartItems>
      <div className="mt-4">
        <CartTotalSummary />
      </div>
    </>
  );
}
