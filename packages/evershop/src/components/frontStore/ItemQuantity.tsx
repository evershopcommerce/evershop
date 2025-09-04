import {
  useCartDispatch,
  useCartState
} from '@components/common/context/cart.js';
import React, {
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef
} from 'react';

interface UseItemQuantityProps {
  initialValue?: number;
  min?: number;
  max?: number;
  onChange?: (quantity: number) => void;
  /**
   * Cart item ID for updating cart items via cart context.
   */
  cartItemId: string;
  /**
   * Debounce time in milliseconds to wait before calling the API.
   * Defaults to 500ms.
   */
  debounce?: number;
  /**
   * Callback function to execute on successful update.
   */
  onSuccess?: () => void;
  /**
   * Callback function to execute on failed update.
   * It receives the error object.
   */
  onFailure?: (error: Error) => void;
}

interface UseItemQuantityReturn {
  quantity: number;
  loading: boolean;
  increase: () => void;
  decrease: () => void;
  setQuantity: (quantity: number) => void;
  inputProps: {
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    type: 'number';
    min?: number;
    max?: number;
    disabled: boolean;
  };
}

export const useItemQuantity = ({
  initialValue = 1,
  min = 1,
  max = Infinity,
  onChange,
  cartItemId,
  debounce = 500,
  onSuccess,
  onFailure
}: UseItemQuantityProps): UseItemQuantityReturn => {
  const [quantity, setInternalQuantity] = useState(initialValue);

  const cartDispatch = useCartDispatch();
  const { loading } = useCartState();
  const previousQuantityRef = useRef(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInternalQuantity(initialValue);
    previousQuantityRef.current = initialValue;
  }, [initialValue]);

  const executeCartUpdate = useCallback(
    async (newQuantity: number) => {
      try {
        const currentQuantity = previousQuantityRef.current;
        const diff = newQuantity - currentQuantity;

        if (diff === 0) {
          return;
        }

        const action = diff > 0 ? 'increase' : 'decrease';
        const qty = Math.abs(diff);

        await cartDispatch.updateItem(cartItemId, { qty, action });
        previousQuantityRef.current = newQuantity;
        if (onChange) {
          onChange(newQuantity);
        }
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        // Revert to the last known good state on failure
        setInternalQuantity(previousQuantityRef.current);
        if (onFailure) {
          onFailure(error as Error);
        }
      }
    },
    [cartItemId, cartDispatch, onChange, onSuccess, onFailure]
  );

  const handleUpdate = useCallback(
    (newQuantity: number, immediate = false) => {
      const clampedQuantity = Math.max(min, Math.min(newQuantity, max));
      setInternalQuantity(clampedQuantity);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (clampedQuantity === previousQuantityRef.current) {
        return;
      }

      if (immediate || debounce === 0) {
        executeCartUpdate(clampedQuantity);
      } else {
        debounceTimerRef.current = setTimeout(() => {
          executeCartUpdate(clampedQuantity);
        }, debounce);
      }
    },
    [min, max, quantity, debounce, executeCartUpdate]
  );

  const increase = useCallback(() => {
    handleUpdate(quantity + 1);
  }, [quantity, handleUpdate]);

  const decrease = useCallback(() => {
    handleUpdate(quantity - 1);
  }, [quantity, handleUpdate]);

  const setQuantity = useCallback(
    (newQuantity: number) => {
      handleUpdate(newQuantity);
    },
    [handleUpdate]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity)) {
      setInternalQuantity(newQuantity);
    } else if (e.target.value === '') {
      setInternalQuantity(0);
    }
  };

  const handleInputBlur = () => {
    handleUpdate(quantity, true);
  };

  return {
    quantity,
    loading,
    increase,
    decrease,
    setQuantity,
    inputProps: {
      value: quantity,
      onChange: handleInputChange,
      onBlur: handleInputBlur,
      type: 'number',
      min,
      max,
      disabled: loading
    }
  };
};

interface ItemQuantityProps extends UseItemQuantityProps {
  children: (props: UseItemQuantityReturn) => ReactNode;
}

/**
 * Item Quantity Component.
 * @param {ItemQuantityProps} props
 * @returns {ReactNode}
 */
export function ItemQuantity({
  children,
  ...props
}: ItemQuantityProps): ReactNode {
  const quantityControls = useItemQuantity(props);
  return children(quantityControls);
}

/*
 * EXAMPLE USAGE WITH CART CONTEXT:
 *
 * <ItemQuantity
 *   initialValue={item.qty}
 *   cartItemId={item.cartItemId}
 *   max={10}
 *   onSuccess={() => console.log('Updated!')}
 *   onFailure={(error) => console.error('Failed:', error)}
 * >
 *   {({ quantity, increase, decrease, inputProps, loading }) => (
 *     <div className="flex items-center border rounded">
 *       <button onClick={decrease} disabled={inputProps.disabled}>-</button>
 *       <input {...inputProps} className="w-16 text-center" />
 *       <button onClick={increase} disabled={inputProps.disabled}>+</button>
 *       {loading && <span>Updating...</span>}
 *     </div>
 *   )}
 * </ItemQuantity>
 *
 * Note: The 'loading' state comes from the cart context and indicates
 * when any cart operation is in progress, providing consistent loading
 * behavior across all cart components.
 */
