import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  publishSafely,
  toCommerceCart
} from '@components/frontStore/commerceEventData.js';
import { dispatchCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

/**
 * Publishes the `cart_viewed` commerce event once when the cart page is
 * shown, with the cart as it is then (it can be empty). Renders nothing.
 */
export default function CartViewedEvent() {
  const { data: cart } = useCartState();
  // Once per page: React runs a mount effect twice in development
  const published = React.useRef(false);

  React.useEffect(() => {
    if (published.current) {
      return;
    }
    published.current = true;
    publishSafely(() => dispatchCommerceEvent('cart_viewed', toCommerceCart(cart)));
  }, []);

  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 100
};
