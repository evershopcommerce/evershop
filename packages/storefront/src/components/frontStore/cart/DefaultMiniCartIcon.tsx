import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import React from 'react';

export const DefaultMiniCartIcon = ({
  totalQty,
  onClick,
  isOpen,
  disabled = false,
  showItemCount = true,
  syncStatus
}: {
  totalQty: number;
  onClick: () => void;
  isOpen: boolean;
  disabled?: boolean;
  showItemCount?: boolean;
  syncStatus: { syncing: boolean };
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mini-cart-icon relative ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${isOpen ? 'active' : ''}`}
      aria-label={`Shopping cart with ${totalQty} items`}
    >
      {syncStatus.syncing ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-divider border-t-primary"></div>
        </div>
      ) : (
        <ShoppingBagIcon
          width={24}
          height={24}
          className="transition-colors"
        />
      )}
      {showItemCount && totalQty > 0 && !syncStatus.syncing && (
        <span className="absolute -top-1 -right-1 bg-accent text-white text-[0.6875rem] rounded-full min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center font-semibold">
          {totalQty > 99 ? '99+' : totalQty}
        </span>
      )}
    </button>
  );
};
