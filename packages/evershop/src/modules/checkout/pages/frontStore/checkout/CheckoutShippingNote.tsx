import { ShippingNote } from '@components/frontStore/checkout/ShippingNote.js';
import React from 'react';

/**
 * Checkout page block: the order note inside the form flow, shown below `lg`
 * only. Above `lg` the summary rail (`checkout/CheckoutSummary`) shows the
 * note instead; both edit the same `checkoutData.note`. Renders nothing when
 * the store setting turns the note off (fetched by this block's own query).
 * A page component rather than markup inside the `CheckoutPage` shell so a
 * theme can move it from `layouts.json`.
 */
export default function CheckoutShippingNote({
  setting
}: {
  setting?: { showShippingNote: boolean };
}): React.ReactElement | null {
  if (!setting?.showShippingNote) return null;
  return (
    <div className="mt-6 lg:hidden">
      <ShippingNote />
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 40
};

export const query = `
  query Query {
    setting {
      showShippingNote
    }
  }
`;
