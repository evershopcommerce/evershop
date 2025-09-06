import {
  useCartDispatch,
  useCartState
} from '@components/common/context/cart.js';
import React, { useState, useCallback } from 'react';
import { _ } from '../../lib/locale/translate/_.js';

// Product information required for adding to cart
export interface ProductInfo {
  sku: string;
  isInStock: boolean;
}

// State information passed to the render function
export interface AddToCartState {
  isLoading: boolean;
  error: string | null;
  canAddToCart: boolean;
  isInStock: boolean;
}

// Actions available to the render function
export interface AddToCartActions {
  addToCart: () => Promise<void>;
  clearError: () => void;
}

// Props for the AddToCart component
export interface AddToCartProps {
  product: ProductInfo;
  qty: number; // The quantity to be added to cart
  onSuccess?: (quantity: number) => void;
  onError?: (error: string) => void;
  children: (
    state: AddToCartState,
    actions: AddToCartActions
  ) => React.ReactNode;
}

export const AddToCart: React.FC<AddToCartProps> = ({
  product,
  qty,
  onSuccess,
  onError,
  children
}) => {
  const cartDispatch = useCartDispatch();
  const cartState = useCartState();

  const [localError, setLocalError] = useState<string | null>(null);

  // Check if we can add to cart
  const canAddToCart = product.isInStock && qty > 0 && !!cartState.data; // Cart must be initialized

  // Determine if we're currently loading
  const isLoading = cartState.loading;

  // Clear error function
  const clearError = useCallback(() => {
    setLocalError(null);
    cartDispatch.clearError();
  }, [cartDispatch]);

  // Add to cart function
  const addToCart = useCallback(async () => {
    if (!canAddToCart) {
      const errorMsg = !product.isInStock
        ? _('Product is out of stock')
        : !cartState.data
        ? _('Cart is not initialized')
        : _('Invalid quantity');

      setLocalError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setLocalError(null);
      cartDispatch.clearError();
      await cartDispatch.addItem({
        sku: product.sku,
        qty: qty
      });
      onSuccess?.(qty);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : _('Failed to add item to cart');
      setLocalError(errorMessage);
      onError?.(errorMessage);
    }
  }, [
    canAddToCart,
    product.isInStock,
    product.sku,
    qty,
    cartState.data,
    cartDispatch,
    onSuccess,
    onError
  ]);

  // Prepare state and actions for render prop
  const state: AddToCartState = {
    isLoading,
    error: localError || cartState.data?.error || null,
    canAddToCart,
    isInStock: product.isInStock
  };

  const actions: AddToCartActions = {
    addToCart,
    clearError
  };

  return <>{children(state, actions)}</>;
};
