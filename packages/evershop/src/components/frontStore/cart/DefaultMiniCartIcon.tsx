import { ShoppingBag } from 'lucide-react';
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
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-border"></div>
        </div>
      ) : (
        <ShoppingBag className="w-5 h-5 text-foreground hover:text-primary" />
      )}
      {showItemCount && totalQty > 0 && !syncStatus.syncing && (
        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-normal">
          {totalQty > 99 ? '99+' : totalQty}
        </span>
      )}
    </button>
  );
};
