import {
  useCartState,
  useCartDispatch
} from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CheckoutData } from '@evershop/evershop/types/checkoutData';
import { produce } from 'immer';
import React, {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  useCallback,
  useMemo
} from 'react';
import { UseFormReturn } from 'react-hook-form';

interface PaymentMethod {
  code: string;
  name: string;
  [key: string]: any;
}

interface PaymentMethodRendererProps {
  isSelected: boolean;
}

interface PaymentMethodComponent {
  nameRenderer: React.ComponentType<PaymentMethodRendererProps>;
  formRenderer: React.ComponentType<PaymentMethodRendererProps>;
  checkoutButtonRenderer: React.ComponentType<PaymentMethodRendererProps>;
}

interface ShippingMethod {
  code: string;
  name: string;
  cost?: {
    value: number;
    text: string;
  };
  [key: string]: any;
}

interface ShippingAddressParams {
  country: string;
  province?: string;
  postcode?: string;
}

interface CheckoutState {
  orderPlaced: boolean;
  orderId?: string;
  loadingStates: {
    placingOrder: boolean;
  };
  allowGuestCheckout: boolean;
  checkoutData: CheckoutData; // Add checkout data to state
  registeredPaymentComponents: Record<string, PaymentMethodComponent>;
}

type CheckoutAction =
  | { type: 'SET_PLACING_ORDER'; payload: boolean }
  | { type: 'SET_ORDER_PLACED'; payload: { orderId: string } }
  | { type: 'SET_CHECKOUT_DATA'; payload: CheckoutData }
  | { type: 'UPDATE_CHECKOUT_DATA'; payload: Partial<CheckoutData> }
  | { type: 'CLEAR_CHECKOUT_DATA' }
  // Payment method component registry actions
  | {
      type: 'REGISTER_PAYMENT_COMPONENT';
      payload: { code: string; component: PaymentMethodComponent };
    };

const initialState: CheckoutState = {
  orderPlaced: false,
  orderId: undefined,
  loadingStates: {
    placingOrder: false
  },
  allowGuestCheckout: false, // Default to false, will be set by provider
  checkoutData: {}, // Initialize empty checkout data
  registeredPaymentComponents: {} // Initialize empty payment component registry
};

// Reducer with Immer for immutable updates
const checkoutReducer = (
  state: CheckoutState,
  action: CheckoutAction
): CheckoutState => {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'SET_PLACING_ORDER':
        draft.loadingStates.placingOrder = action.payload;
        break;
      case 'SET_ORDER_PLACED':
        draft.orderPlaced = true;
        draft.orderId = action.payload.orderId;
        draft.loadingStates.placingOrder = false;
        break;
      case 'SET_CHECKOUT_DATA':
        draft.checkoutData = action.payload;
        break;
      case 'UPDATE_CHECKOUT_DATA':
        draft.checkoutData = { ...draft.checkoutData, ...action.payload };
        break;
      case 'CLEAR_CHECKOUT_DATA':
        draft.checkoutData = {};
        break;
      case 'REGISTER_PAYMENT_COMPONENT':
        draft.registeredPaymentComponents[action.payload.code] =
          action.payload.component;
        break;
    }
  });
};

// Context types
interface CheckoutContextValue extends CheckoutState {
  cartId: string | undefined;
  checkoutSuccessUrl: string;
  loading: boolean; // Computed from loadingStates
  requiresShipment: boolean; // Computed from cart items
  form: UseFormReturn<any>; // React Hook Form instance
}

interface CheckoutDispatchContextValue {
  placeOrder: () => Promise<any>;
  checkout: () => Promise<any>;
  getPaymentMethods: () => PaymentMethod[];
  getShippingMethods: (
    params?: ShippingAddressParams
  ) => Promise<ShippingMethod[]>;
  // Checkout data management
  setCheckoutData: (data: CheckoutData) => void;
  updateCheckoutData: (data: Partial<CheckoutData>) => void;
  clearCheckoutData: () => void;
  // Payment method component registry
  registerPaymentComponent: (
    code: string,
    component: PaymentMethodComponent
  ) => void;
  enableForm: () => void;
  disableForm: () => void;
}

// Contexts
const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined
);
const CheckoutDispatchContext = createContext<
  CheckoutDispatchContextValue | undefined
>(undefined);

// Provider props
interface CheckoutProviderProps {
  children: ReactNode;
  placeOrderApi: string;
  checkoutSuccessUrl: string;
  allowGuestCheckout?: boolean; // Optional, defaults to false
  form: UseFormReturn<any>; // React Hook Form instance passed from outside
  enableForm: () => void;
  disableForm: () => void;
}

// Retry utility (similar to cart context)
const retry = async (
  fn: () => Promise<Response>,
  retries = 3,
  delay = 1000
): Promise<Response> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export function CheckoutProvider({
  children,
  placeOrderApi,
  checkoutSuccessUrl,
  allowGuestCheckout = false,
  form,
  enableForm,
  disableForm
}: CheckoutProviderProps) {
  const [state, dispatch] = useReducer(checkoutReducer, {
    ...initialState,
    allowGuestCheckout
  });

  // Get cart state for computing requiresShipment and cartId
  const cartState = useCartState();
  const cartDispatch = useCartDispatch();
  const cartId = cartState?.data?.uuid;

  // Get payment methods - return the list from cart context
  const getPaymentMethods = useCallback((): PaymentMethod[] => {
    return (cartState.data?.availablePaymentMethods || []).map((method) => ({
      code: method.code,
      name: method.name
    }));
  }, [cartState.data?.availablePaymentMethods]);

  // Get shipping methods - if params provided, fetch dynamically; otherwise return from cart context
  const getShippingMethods = useCallback(
    async (params?: ShippingAddressParams): Promise<ShippingMethod[]> => {
      if (params) {
        // Fetch shipping methods dynamically based on address
        try {
          await cartDispatch.fetchAvailableShippingMethods(params);
          // Get updated methods from cart state
          const methods = cartState.data?.availableShippingMethods || [];
          return methods.map((method) => ({
            code: method.code,
            name: method.name,
            cost: method.cost || { value: 0, text: 'Free' }
          }));
        } catch (error) {
          // Return empty array on error, let the error be handled by cart context
          return [];
        }
      } else {
        // Return the initial shipping methods from cart context
        return (cartState.data?.availableShippingMethods || []).map(
          (method) => ({
            code: method.code,
            name: method.name,
            cost: method.cost || { value: 0, text: 'Free' }
          })
        );
      }
    },
    [cartDispatch, cartState.data?.availableShippingMethods]
  );

  // Compute requiresShipment based on cart items
  const requiresShipment = useMemo(() => {
    // Just return true for now as all products require shipping. We will get back to this when virtual/downloadable products are supported.
    return true;
  }, [cartState?.data?.items]);

  // Place order with loading state and error handling (original API - expects data already in cart)
  const placeOrder = useCallback(async () => {
    if (!cartId) {
      throw new Error('Cart ID is required to place order');
    }

    dispatch({ type: 'SET_PLACING_ORDER', payload: true });

    const response = await retry(() =>
      fetch(placeOrderApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_id: cartId })
      })
    );

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error?.message || _('Failed to place order'));
    }

    dispatch({
      type: 'SET_ORDER_PLACED',
      payload: { orderId: json.data.uuid }
    });

    return json.data;
  }, [placeOrderApi, cartId]);

  // New checkout method with all data submission (cart.checkoutApi)
  const checkout = useCallback(async () => {
    if (!cartId) {
      throw new Error(_('Cart ID is required to checkout'));
    }

    // Trigger form validation
    const isValid = await form.trigger(undefined, {
      shouldFocus: true
    });
    if (!isValid) {
      return;
    }

    disableForm();
    dispatch({ type: 'SET_PLACING_ORDER', payload: true });

    const response = await retry(() =>
      fetch(cartState.data?.checkoutApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_id: cartId,
          ...state.checkoutData
        })
      })
    );

    const json = await response.json();

    if (!response.ok) {
      enableForm();
      throw new Error(json.error?.message || _('Failed to checkout'));
    }

    dispatch({
      type: 'SET_ORDER_PLACED',
      payload: { orderId: json.data.uuid }
    });

    return json.data;
  }, [
    cartState.data?.checkoutApi,
    cartId,
    state.checkoutData,
    form,
    enableForm,
    disableForm
  ]);

  // Checkout data management
  const setCheckoutData = useCallback((data: CheckoutData) => {
    dispatch({ type: 'SET_CHECKOUT_DATA', payload: data });
  }, []);

  const updateCheckoutData = useCallback((data: Partial<CheckoutData>) => {
    dispatch({ type: 'UPDATE_CHECKOUT_DATA', payload: data });
  }, []);

  const clearCheckoutData = useCallback(() => {
    dispatch({ type: 'CLEAR_CHECKOUT_DATA' });
  }, []);

  // Payment method component registry
  const registerPaymentComponent = useCallback(
    (code: string, component: PaymentMethodComponent) => {
      dispatch({
        type: 'REGISTER_PAYMENT_COMPONENT',
        payload: { code, component }
      });
    },
    []
  );

  const contextValue = useMemo(
    (): CheckoutContextValue => ({
      ...state,
      cartId,
      checkoutSuccessUrl,
      requiresShipment,
      form,
      loading: state.loadingStates.placingOrder
    }),
    [state, cartId, checkoutSuccessUrl, requiresShipment, form]
  );

  const dispatchMethods = useMemo(
    (): CheckoutDispatchContextValue => ({
      placeOrder,
      checkout,
      getPaymentMethods,
      getShippingMethods,
      setCheckoutData,
      updateCheckoutData,
      clearCheckoutData,
      registerPaymentComponent,
      enableForm,
      disableForm
    }),
    [
      placeOrder,
      checkout,
      getPaymentMethods,
      getShippingMethods,
      setCheckoutData,
      updateCheckoutData,
      clearCheckoutData,
      registerPaymentComponent,
      enableForm,
      disableForm
    ]
  );

  return (
    <CheckoutDispatchContext.Provider value={dispatchMethods}>
      <CheckoutContext.Provider value={contextValue}>
        {children}
      </CheckoutContext.Provider>
    </CheckoutDispatchContext.Provider>
  );
}

export const useCheckout = (): CheckoutContextValue => {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

export const useCheckoutDispatch = (): CheckoutDispatchContextValue => {
  const context = useContext(CheckoutDispatchContext);
  if (context === undefined) {
    throw new Error(
      'useCheckoutDispatch must be used within a CheckoutProvider'
    );
  }
  return context;
};

export type {
  PaymentMethod,
  ShippingMethod,
  ShippingAddressParams,
  CheckoutState
};
