import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  publishSafely,
  toCommerceCart
} from '@components/frontStore/commerceEventData.js';
import { dispatchCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

/**
 * Publishes the `checkout_started` commerce event once when the checkout
 * page is shown, with the cart. Renders nothing.
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
  }, []);

  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 100
};
