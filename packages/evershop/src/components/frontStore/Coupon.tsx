import {
  useCartDispatch,
  useCartState
} from '@components/common/context/cart.js';
import React, { useState, useCallback } from 'react';
import { _ } from '../../lib/locale/translate/_.js';

// State information passed to the render function
export interface CouponState {
  isLoading: boolean;
  error: string | null;
  appliedCoupon: string | null; // Currently applied coupon from cart
  canApplyCoupon: boolean;
  canRemoveCoupon: boolean;
  hasActiveCoupon: boolean;
}

// Actions available to the render function
export interface CouponActions {
  applyCoupon: (code: string) => Promise<void>; // Developer provides the coupon code
  removeCoupon: () => Promise<void>;
  clearError: () => void;
}

// Props for the Coupon component
export interface CouponProps {
  onApplySuccess?: (couponCode: string) => void;
  onRemoveSuccess?: () => void;
  onError?: (error: string) => void;
  children: (state: CouponState, actions: CouponActions) => React.ReactNode;
}

/**
 * Coupon Component
 *
 * A flexible component that handles applying and removing coupons from the shopping cart.
 * Uses render props pattern to allow complete customization of the UI.
 *
 * Note: Coupon removal is implemented by applying an empty coupon code.
 * If your API has a dedicated remove coupon endpoint, update the removeCoupon function accordingly.
 *
 * @example
 * ```tsx
 * <Coupon
 *   onApplySuccess={(code) => showToast(`Applied coupon: ${code}`)}
 *   onRemoveSuccess={() => showToast('Coupon removed')}
 * >
 *   {(state, actions) => {
 *     const [couponCode, setCouponCode] = useState('');
 *
 *     return (
 *       <div>
 *         {!state.hasActiveCoupon ? (
 *           <div>
 *             <input
 *               type="text"
 *               value={couponCode}
 *               onChange={(e) => setCouponCode(e.target.value)}
 *               placeholder="Enter coupon code"
 *               disabled={state.isLoading}
 *             />
 *             <button
 *               onClick={() => actions.applyCoupon(couponCode)}
 *               disabled={!state.canApplyCoupon || state.isLoading}
 *             >
 *               {state.isLoading ? 'Applying...' : 'Apply'}
 *             </button>
 *           </div>
 *         ) : (
 *           <div>
 *             <span>Applied: {state.appliedCoupon}</span>
 *             <button
 *               onClick={actions.removeCoupon}
 *               disabled={state.isLoading}
 *             >
 *               {state.isLoading ? 'Removing...' : 'Remove'}
 *             </button>
 *           </div>
 *         )}
 *         {state.error && <div className="error">{state.error}</div>}
 *       </div>
 *     );
 *   }}
 * </Coupon>
 * ```
 */
export const Coupon: React.FC<CouponProps> = ({
  onApplySuccess,
  onRemoveSuccess,
  onError,
  children
}) => {
  const cartDispatch = useCartDispatch();
  const cartState = useCartState();

  const [localError, setLocalError] = useState<string | null>(null);

  // Get current applied coupon from cart
  const appliedCoupon = cartState.data?.coupon || null;
  const hasActiveCoupon = !!appliedCoupon && appliedCoupon.trim() !== '';

  // Check if we can apply/remove coupons
  const canApplyCoupon = !!cartState.data && !hasActiveCoupon;
  const canRemoveCoupon = !!cartState.data && hasActiveCoupon;

  // Determine if we're currently loading
  const isLoading = cartState.loading;

  // Clear error function
  const clearError = useCallback(() => {
    setLocalError(null);
    cartDispatch.clearError();
  }, [cartDispatch]);

  // Apply coupon function
  const applyCoupon = useCallback(
    async (code: string) => {
      if (!canApplyCoupon || !code.trim()) {
        const errorMsg = !cartState.data
          ? _('Cart is not initialized')
          : hasActiveCoupon
          ? _('A coupon is already applied')
          : _('Please enter a coupon code');

        setLocalError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      try {
        // Clear any existing errors
        setLocalError(null);
        cartDispatch.clearError();

        // Apply coupon
        await cartDispatch.applyCoupon(code.trim());

        // Call success callback
        onApplySuccess?.(code.trim());
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : _('Failed to apply coupon');
        setLocalError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [
      canApplyCoupon,
      cartState.data,
      hasActiveCoupon,
      cartDispatch,
      onApplySuccess,
      onError
    ]
  );

  // Remove coupon function
  const removeCoupon = useCallback(async () => {
    if (!canRemoveCoupon) {
      const errorMsg = !cartState.data
        ? _('Cart is not initialized')
        : _('No coupon to remove');

      setLocalError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      // Clear any existing errors
      setLocalError(null);
      cartDispatch.clearError();
      await cartDispatch.removeCoupon();

      // Call success callback
      onRemoveSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : _('Failed to remove coupon');
      setLocalError(errorMessage);
      onError?.(errorMessage);
    }
  }, [canRemoveCoupon, cartState.data, cartDispatch, onRemoveSuccess, onError]);

  // Prepare state and actions for render prop
  const state: CouponState = {
    isLoading,
    error: localError || cartState.data?.error || null,
    appliedCoupon,
    canApplyCoupon,
    canRemoveCoupon,
    hasActiveCoupon
  };

  const actions: CouponActions = {
    applyCoupon,
    removeCoupon,
    clearError
  };

  return <>{children(state, actions)}</>;
};

export default Coupon;
