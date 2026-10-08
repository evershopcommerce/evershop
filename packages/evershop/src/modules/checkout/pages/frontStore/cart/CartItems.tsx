import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { DefaultCartItemList } from '@components/frontStore/cart/DefaultCartItemList.js';
import React from 'react';

/**
 * Cart page block: the item list. A page component rather than markup inside
 * the `ShoppingCart` shell so a theme can move it from `layouts.json`.
 */
export default function CartItemsBlock(): React.ReactElement {
  return (
    <CartItems>
      {({ items, showPriceIncludingTax, loading, onRemoveItem }) => (
        <DefaultCartItemList
          items={items}
          showPriceIncludingTax={showPriceIncludingTax}
          loading={loading}
          onRemoveItem={onRemoveItem}
        />
      )}
    </CartItems>
  );
}

export const layout = {
  areaId: 'shoppingCartItems',
  sortOrder: 10
};
