import {
  useCartDispatch,
  useCartState
} from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useState, useCallback } from 'react';

export interface CouponState {
  isLoading: boolean;
  error: string | null;
  appliedCoupon: string | null;
  canApplyCoupon: boolean;
  canRemoveCoupon: boolean;
  hasActiveCoupon: boolean;
}

export interface CouponActions {
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  clearError: () => void;
}

export interface CouponProps {
  onApplySuccess?: (couponCode: string) => void;
  onRemoveSuccess?: () => void;
  onError?: (error: string) => void;
  children: (state: CouponState, actions: CouponActions) => React.ReactNode;
}

export const Coupon: React.FC<CouponProps> = ({
  onApplySuccess,
  onRemoveSuccess,
  onError,
  children
}) => {
  const cartDispatch = useCartDispatch();
  const cartState = useCartState();

  const [localError, setLocalError] = useState<string | null>(null);

  const appliedCoupon = cartState.data?.coupon || null;
  const hasActiveCoupon = !!appliedCoupon && appliedCoupon.trim() !== '';

  const canApplyCoupon = !!cartState.data && !hasActiveCoupon;
  const canRemoveCoupon = !!cartState.data && hasActiveCoupon;

  const isLoading = cartState.loading;

  const clearError = useCallback(() => {
    setLocalError(null);
    cartDispatch.clearError();
  }, [cartDispatch]);

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
        setLocalError(null);
        cartDispatch.clearError();
        await cartDispatch.applyCoupon(code.trim());
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
      setLocalError(null);
      cartDispatch.clearError();
      await cartDispatch.removeCoupon();

      onRemoveSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : _('Failed to remove coupon');
      setLocalError(errorMessage);
      onError?.(errorMessage);
    }
  }, [canRemoveCoupon, cartState.data, cartDispatch, onRemoveSuccess, onError]);

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
