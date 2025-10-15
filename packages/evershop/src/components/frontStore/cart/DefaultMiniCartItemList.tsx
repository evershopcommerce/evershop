import { CartItem } from '@components/frontStore/cart/CartContext.js';
import { CartSummaryItemsList } from '@components/frontStore/cart/CartSummaryItems.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CartItemsTableProps {
  items: CartItem[];
  showPriceIncludingTax?: boolean;
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
}

export const DefaultMiniCartItemList: React.FC<CartItemsTableProps> = ({
  items,
  showPriceIncludingTax = true,
  loading = false
}) => {
  return (
    <CartSummaryItemsList
      items={items}
      loading={loading}
      showPriceIncludingTax={showPriceIncludingTax}
    />
  );
};
