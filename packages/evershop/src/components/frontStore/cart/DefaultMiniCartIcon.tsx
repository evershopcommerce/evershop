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
      className={`mini-cart-icon relative rounded-md p-2 text-foreground/80 hover:bg-muted hover:text-foreground ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${isOpen ? 'active' : ''}`}
      aria-label={`Shopping cart with ${totalQty} items`}
    >
      {syncStatus.syncing ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-border"></div>
        </div>
      ) : (
        <ShoppingBag className="h-5 w-5" />
      )}
      {showItemCount && totalQty > 0 && !syncStatus.syncing && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {totalQty > 99 ? '99+' : totalQty}
        </span>
      )}
    </button>
  );
};
