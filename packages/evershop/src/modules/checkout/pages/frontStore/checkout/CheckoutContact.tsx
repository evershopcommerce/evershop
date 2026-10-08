import { ContactInformation } from '@components/frontStore/checkout/ContactInformation.js';
import React from 'react';

/**
 * Checkout page block: the contact information step. A page component rather than markup inside the
 * `CheckoutPage` shell so a theme can move it from `layouts.json`. It registers fields on the checkout form, so it must stay inside
 * the form's Areas (`checkoutFormBefore`, `checkoutSteps`, `checkoutForm`, `checkoutFormAfter`).
 */
export default function CheckoutContact(): React.ReactElement {
  return <ContactInformation />;
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 10
};
