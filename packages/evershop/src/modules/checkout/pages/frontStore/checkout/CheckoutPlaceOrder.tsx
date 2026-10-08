import { CheckoutButton } from '@components/frontStore/checkout/CheckoutButton.js';
import React from 'react';

/**
 * Checkout page block: the place-order button. A page component rather than markup inside the
 * `CheckoutPage` shell so a theme can move it from `layouts.json`.
 * It reads the checkout context (not the form element), so it works anywhere
 * inside the shell, the summary rail included.
 */
export default function CheckoutPlaceOrder(): React.ReactElement {
  return <CheckoutButton />;
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 50
};
