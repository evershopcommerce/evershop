import { OrderSummaryContent } from '@components/frontStore/checkout/OrderSummaryContent.js';
import { ShippingNote } from '@components/frontStore/checkout/ShippingNote.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Checkout page block: the desktop summary rail, the order note (when the
 * store setting allows it, fetched by this block's own query) and the order
 * summary card. A page component rather than markup inside the `CheckoutPage`
 * shell so a theme can move it from `layouts.json`.
 */
export default function CheckoutSummary({
  setting
}: {
  setting?: { showShippingNote: boolean };
}): React.ReactElement {
  return (
    <>
      {setting?.showShippingNote && <ShippingNote />}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 h4">{_('Order summary')}</h2>
        <OrderSummaryContent />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'checkoutSummary',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      showShippingNote
    }
  }
`;
