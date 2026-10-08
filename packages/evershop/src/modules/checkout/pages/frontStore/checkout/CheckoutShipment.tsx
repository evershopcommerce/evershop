import { Shipment } from '@components/frontStore/checkout/Shipment.js';
import React from 'react';

/**
 * Checkout page block: the shipping step (address + method). A page component rather than markup inside the
 * `CheckoutPage` shell so a theme can move it from `layouts.json`. It registers fields on the checkout form, so it must stay inside
 * the form's Areas (`checkoutFormBefore`, `checkoutSteps`, `checkoutForm`, `checkoutFormAfter`).
 */
export default function CheckoutShipment(): React.ReactElement {
  return <Shipment />;
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 20
};
