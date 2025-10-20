import Area from '@components/common/Area.js';
import { useAppState } from '@components/common/context/app.js';
import {
  useCartState,
  useCartDispatch,
  CartItem
} from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CartItemsProps {
  children: (props: {
    items: CartItem[];
    showPriceIncludingTax?: boolean;
    loading: boolean;
    isEmpty: boolean;
    totalItems: number;
    onRemoveItem: (itemId: string) => Promise<void>;
  }) => React.ReactNode;
}

function CartItems({ children }: CartItemsProps) {
  const { data: cart, loading } = useCartState();
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();
  const { removeItem } = useCartDispatch();

  const isEmpty = cart?.totalQty === 0;
  const totalItems = cart?.totalQty || 0;

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  return (
    <div className="cart-items">
      <Area id="cartItemsBefore" noOuter />
      {children
        ? children({
            items: cart?.items || [],
            showPriceIncludingTax: priceIncludingTax,
            loading,
            isEmpty,
            totalItems,
            onRemoveItem: handleRemoveItem
          })
        : null}
      <Area id="cartItemsAfter" noOuter />
    </div>
  );
}

export { CartItems };
