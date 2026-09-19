import { Payment } from '@components/frontStore/checkout/Payment.js';
import React from 'react';

/**
 * Checkout page block: the payment step. A page component rather than markup inside the
 * `CheckoutPage` shell so a theme can move it from `layouts.json`. It registers fields on the checkout form, so it must stay inside
 * the form's Areas (`checkoutFormBefore`, `checkoutSteps`, `checkoutForm`, `checkoutFormAfter`).
 */
export default function CheckoutPayment(): React.ReactElement {
  return <Payment />;
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 30
};
