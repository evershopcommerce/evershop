import Area from '@components/common/Area.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { ShoppingCartEmpty } from '@components/frontStore/cart/ShoppingCartEmpty.js';
import React from 'react';

/**
 * Cart page shell. It owns the empty-state switch, the two-column grid and
 * the slots (Areas); the content is sibling page blocks that register into
 * those slots, so a theme can re-position them from `layouts.json` without
 * overriding this file:
 *
 *   cart/CartTitle    → shoppingCartHeader  10  (title + item count)
 *   cart/CartItems    → shoppingCartItems   10  (item list)
 *   cart/CartSummary  → shoppingCartSummary 10  (order summary card, checkout button)
 */
export default function ShoppingCart() {
  const { data: cart } = useCartState();
  return (
    <div className="cart">
      {cart.items.length > 0 ? (
        <>
          <Area id="shoppingCartHeader" noOuter />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              <Area id="shoppingCartItems" noOuter />
            </div>
            <div className="h-fit">
              <Area id="shoppingCartSummary" noOuter />
            </div>
          </div>
        </>
      ) : (
        <ShoppingCartEmpty />
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
