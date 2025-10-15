import {
  useCartState,
  CartData,
  CartSyncTrigger
} from '@components/frontStore/cart/CartContext.js';
import { DefaultMiniCartDropdown } from '@components/frontStore/cart/DefaultMiniCartDropdown.js';
import { DefaultMiniCartIcon } from '@components/frontStore/cart/DefaultMiniCartIcon.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useCallback, useState, useEffect } from 'react';

interface MiniCartProps {
  cartUrl?: string;
  dropdownPosition?: 'left' | 'right';
  showItemCount?: boolean;
  CartIconComponent?: React.FC<{
    totalQty: number;
    onClick: () => void;
    isOpen: boolean;
    disabled?: boolean;
    showItemCount?: boolean;
    syncStatus: { syncing: boolean };
  }>;
  CartDropdownComponent?: React.FC<{
    cart: CartData | null;
    dropdownPosition?: 'left' | 'right';
    onClose: () => void;
    cartUrl?: string;
    setIsDropdownOpen: (isOpen: boolean) => void;
  }>;
  onItemRemove?: (itemId: string) => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}

export function MiniCart({
  cartUrl = '/cart',
  dropdownPosition = 'right',
  showItemCount = true,
  CartIconComponent,
  CartDropdownComponent,
  className = '',
  disabled = false
}: MiniCartProps) {
  const { data: cartData, syncStatus } = useCartState();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const cart = cartData;

  const handleCartClick = useCallback(() => {
    if (disabled) return;

    setIsDropdownOpen(!isDropdownOpen);
  }, [disabled, isDropdownOpen, cartUrl]);

  const handleDropdownClose = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (syncStatus.synced && syncStatus.trigger === CartSyncTrigger.ADD_ITEM) {
      setIsDropdownOpen(true);
    }
  }, [syncStatus.synced, syncStatus.trigger]);

  return (
    <div className={`mini__cart__wrapper relative ${className}`}>
      {CartIconComponent ? (
        <CartIconComponent
          totalQty={cart?.totalQty || 0}
          onClick={handleCartClick}
          isOpen={isDropdownOpen}
          disabled={disabled}
          showItemCount={showItemCount}
          syncStatus={syncStatus}
        />
      ) : (
        <DefaultMiniCartIcon
          totalQty={cart?.totalQty || 0}
          onClick={handleCartClick}
          isOpen={isDropdownOpen}
          disabled={disabled}
          showItemCount={showItemCount}
          syncStatus={syncStatus}
        />
      )}

      {CartDropdownComponent ? (
        <CartDropdownComponent
          cart={cart}
          dropdownPosition={dropdownPosition}
          onClose={handleDropdownClose}
          cartUrl={cartUrl}
          setIsDropdownOpen={setIsDropdownOpen}
        />
      ) : (
        <DefaultMiniCartDropdown
          cart={cart}
          isOpen={isDropdownOpen}
          dropdownPosition={dropdownPosition}
          onClose={handleDropdownClose}
          cartUrl={cartUrl}
          setIsDropdownOpen={setIsDropdownOpen}
        />
      )}
    </div>
  );
}
