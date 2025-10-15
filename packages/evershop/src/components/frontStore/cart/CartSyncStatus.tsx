import {
  useCartState,
  CartSyncTrigger
} from '@components/frontStore/cart/CartContext.js';
import React from 'react';

/**
 * CartSyncStatus Component
 *
 * Example component demonstrating how to use the cart sync status tracking.
 * Shows the current sync status and the last operation that triggered synchronization.
 */
export function CartSyncStatus() {
  const state = useCartState();
  const { syncStatus } = state;

  // Show loading state while syncing
  if (syncStatus.syncing) {
    return (
      <div className="cart-sync-status bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md text-sm">
        <div className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 animate-spin"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H4zm6 0a2 2 0 00-2 2v11a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2z"
              clipRule="evenodd"
            />
          </svg>
          Syncing cart...
        </div>
      </div>
    );
  }

  if (!syncStatus.synced) {
    return null; // Don't show anything if cart hasn't been synced yet
  }

  const getStatusMessage = () => {
    if (!syncStatus.trigger) {
      return 'Cart synchronized';
    }

    // Handle internal triggers (enum values)
    const triggerMessages: Record<CartSyncTrigger, string> = {
      [CartSyncTrigger.ADD_ITEM]: 'Item added to cart',
      [CartSyncTrigger.REMOVE_ITEM]: 'Item removed from cart',
      [CartSyncTrigger.UPDATE_ITEM]: 'Item quantity updated',
      [CartSyncTrigger.ADD_PAYMENT_METHOD]: 'Payment method added',
      [CartSyncTrigger.ADD_SHIPPING_METHOD]: 'Shipping method selected',
      [CartSyncTrigger.ADD_SHIPPING_ADDRESS]: 'Shipping address updated',
      [CartSyncTrigger.ADD_BILLING_ADDRESS]: 'Billing address updated',
      [CartSyncTrigger.ADD_CONTACT_INFO]: 'Contact information updated',
      [CartSyncTrigger.APPLY_COUPON]: 'Coupon applied',
      [CartSyncTrigger.REMOVE_COUPON]: 'Coupon removed'
    };

    // Check if it's an internal trigger (enum value)
    if (syncStatus.trigger in triggerMessages) {
      return triggerMessages[syncStatus.trigger as CartSyncTrigger];
    }

    // Handle external triggers (custom strings)
    return `Cart synchronized (${syncStatus.trigger})`;
  };

  return (
    <div className="cart-sync-status bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">
      <div className="flex items-center">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {getStatusMessage()}
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * import { CartSyncStatus } from './CartSyncStatus';
 * import { useCartState, useCartDispatch } from './cartContext';
 *
 * function MyCartComponent() {
 *   const cartState = useCartState();
 *   const cartDispatch = useCartDispatch();
 *
 *   return (
 *     <div>
 *       <CartSyncStatus />
 *
 *       // Show sync loading state
 *       {cartState.syncStatus.syncing && <div>Syncing...</div>}
 *
 *       // External sync call with custom trigger
 *       <button onClick={() => cartDispatch.syncCartWithServer('manual-refresh')}>
 *         Refresh Cart
 *       </button>
 *
 *       // Other cart components...
 *     </div>
 *   );
 * }
 */
