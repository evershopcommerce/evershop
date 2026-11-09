import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  publishSafely,
  toCommerceCart
} from '@components/frontStore/commerceEventData.js';
import { dispatchCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

/** The carts and customers this browser session has published, newest last */
const STORAGE_KEY = 'evershop:checkout_contact_info_submitted';
const REMEMBERED = 20;

function readPublished(): string[] {
  try {
    const list = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) || '[]'
    );
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function rememberPublished(list: string[]): void {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(-REMEMBERED))
    );
  } catch (e) {
    // Storage blocked: the event comes again with the next checkout page
  }
}

/**
 * Publishes the `checkout_started` commerce event once when the checkout
 * page is shown, with the cart. Renders nothing.
 *
 * For a logged-in customer it then publishes `checkout_contact_info_submitted`
 * (`loggedIn: true`): their cart has the account email from the start
 * (`[auth]addCustomerToCart.ts`), so the event means "this checkout has an
 * email" for every shopper, and comes after `checkout_started` as the
 * checkout steps do. Once per cart and customer in a browser session, so a
 * reload publishes nothing; a guest who logs in at checkout gets it again,
 * for the account. A guest's comes from `CartContext.addContactInfo`.
 */
export default function CheckoutStartedEvent() {
  const { data: cart } = useCartState();
  // Once per page: React runs a mount effect twice in development
  const published = React.useRef(false);

  React.useEffect(() => {
    if (published.current) {
      return;
    }
    published.current = true;
    publishSafely(() =>
      dispatchCommerceEvent('checkout_started', toCommerceCart(cart))
    );
    if (!cart?.uuid || !cart.customerId) {
      return;
    }
    const key = `${cart.uuid}:${cart.customerId}`;
    const list = readPublished();
    if (list.includes(key)) {
      return;
    }
    rememberPublished([...list, key]);
    publishSafely(() =>
      dispatchCommerceEvent('checkout_contact_info_submitted', {
        ...toCommerceCart(cart),
        loggedIn: true
      })
    );
  }, []);

  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 100
};
