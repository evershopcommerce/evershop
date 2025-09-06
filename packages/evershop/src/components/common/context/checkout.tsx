import * as Topo from '@hapi/topo';
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
import { _ } from '../../../lib/locale/translate/_.js';
import { CheckoutData } from '../../../types/checkoutData.js';
import { useCartState, useCartDispatch } from './cart.js';

// Types
interface PaymentMethod {
  code: string;
  name: string;
  [key: string]: any;
}

// Payment method component types
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

interface CheckoutError {
  type:
    | 'PLACE_ORDER_ERROR'
    | 'PAYMENT_ERROR'
    | 'CHECKOUT_STEP_ERROR'
    | 'GENERIC_ERROR';
  message: string;
  code?: number;
}

// Checkout step types
interface CheckoutStep {
  id: string;
  isCompleted: boolean;
  dependencies: string[]; // Array of step IDs that this step depends on
  onComplete: () => Promise<boolean> | boolean;
}

interface CheckoutState {
  orderPlaced: boolean;
  orderId?: string;
  error: CheckoutError | null;
  loadingStates: {
    placingOrder: boolean;
  };
  allowGuestCheckout: boolean;
  steps: Record<string, CheckoutStep>; // Use Record instead of Map
  checkoutData: CheckoutData; // Add checkout data to state
  // Payment method component registry
  registeredPaymentComponents: Record<string, PaymentMethodComponent>; // code -> component
  // requiresShipment is now computed from cart items, not stored in state
  // paymentMethods and shippingMethods are now accessed directly from cart context
}

type CheckoutAction =
  | { type: 'SET_PLACING_ORDER'; payload: boolean }
  | { type: 'SET_ORDER_PLACED'; payload: { orderId: string } }
  | { type: 'SET_ERROR'; payload: CheckoutError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_CHECKOUT' }
  | { type: 'ADD_STEP'; payload: CheckoutStep }
  | { type: 'REMOVE_STEP'; payload: string }
  | {
      type: 'UPDATE_STEP_COMPLETED';
      payload: { id: string; isCompleted: boolean };
    }
  | { type: 'CLEAR_STEPS' }
  | { type: 'SET_CHECKOUT_DATA'; payload: CheckoutData }
  | { type: 'UPDATE_CHECKOUT_DATA'; payload: Partial<CheckoutData> }
  | { type: 'CLEAR_CHECKOUT_DATA' }
  // Payment method component registry actions
  | {
      type: 'REGISTER_PAYMENT_COMPONENT';
      payload: { code: string; component: PaymentMethodComponent };
    };

// Initial state
const initialState: CheckoutState = {
  orderPlaced: false,
  orderId: undefined,
  error: null,
  loadingStates: {
    placingOrder: false
  },
  allowGuestCheckout: false, // Default to false, will be set by provider
  steps: {}, // Initialize empty steps object
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
        draft.error = null;
        break;
      case 'SET_ERROR':
        draft.error = action.payload;
        draft.loadingStates.placingOrder = false;
        break;
      case 'CLEAR_ERROR':
        draft.error = null;
        break;
      case 'RESET_CHECKOUT':
        return {
          ...initialState,
          allowGuestCheckout: draft.allowGuestCheckout
        };
      case 'ADD_STEP':
        draft.steps[action.payload.id] = action.payload;
        break;
      case 'REMOVE_STEP':
        delete draft.steps[action.payload];
        break;
      case 'UPDATE_STEP_COMPLETED':
        const step = draft.steps[action.payload.id];
        if (step) {
          step.isCompleted = action.payload.isCompleted;
        }
        break;
      case 'CLEAR_STEPS':
        draft.steps = {};
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
  setError: (error: CheckoutError | null) => void;
  clearError: () => void;
  resetCheckout: () => void;
  // Checkout steps management
  addStep: (step: CheckoutStep) => void;
  removeStep: (id: string) => void;
  completeStep: (id: string) => Promise<boolean>;
  clearSteps: () => void;
  getSteps: () => CheckoutStep[];
  getIncompleteSteps: () => CheckoutStep[];
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

  // Checkout steps management
  const addStep = useCallback((step: CheckoutStep) => {
    dispatch({ type: 'ADD_STEP', payload: step });
  }, []);

  const removeStep = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_STEP', payload: id });
  }, []);

  const completeStep = useCallback(
    async (id: string): Promise<boolean> => {
      const step = state.steps[id];
      if (!step) {
        throw new Error(`Step with id '${id}' not found`);
      }

      try {
        const result = await step.onComplete();
        if (result) {
          dispatch({
            type: 'UPDATE_STEP_COMPLETED',
            payload: { id, isCompleted: true }
          });
        }
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Step '${id}' completion failed`;
        dispatch({
          type: 'SET_ERROR',
          payload: {
            type: 'CHECKOUT_STEP_ERROR',
            message: errorMessage
          }
        });
        return false;
      }
    },
    [state.steps]
  );

  const clearSteps = useCallback(() => {
    dispatch({ type: 'CLEAR_STEPS' });
  }, []);

  const getSteps = useCallback((): CheckoutStep[] => {
    return Object.values(state.steps);
  }, [state.steps]);

  const getIncompleteSteps = useCallback((): CheckoutStep[] => {
    return Object.values(state.steps).filter((step) => !step.isCompleted);
  }, [state.steps]);

  // Sort steps by dependencies using @hapi/topo
  const sortStepsByDependencies = useCallback(
    (steps: CheckoutStep[]): CheckoutStep[] => {
      try {
        const topo = new Topo.Sorter();

        // Add all steps to the sorter
        for (const step of steps) {
          topo.add(step, {
            after: step.dependencies.length > 0 ? step.dependencies : undefined,
            group: step.id
          });
        }

        // Return the sorted steps with proper typing
        return topo.nodes as CheckoutStep[];
      } catch (error) {
        // @hapi/topo throws errors for circular dependencies
        throw new Error(
          `Dependency sorting failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    },
    []
  );

  // Special onSubmit function that executes all steps in dependency order
  // REMOVED - not needed for now

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
    if (!cartState?.data?.items || cartState.data.items.length === 0) {
      return false; // Empty cart doesn't require shipping
    }

    // Check if any item is NOT virtual (i.e., physical product)
    return cartState.data.items.some((item) => !item.virtual);
  }, [cartState?.data?.items]);

  // Place order with loading state and error handling (original API - expects data already in cart)
  const placeOrder = useCallback(async () => {
    try {
      if (!cartId) {
        throw new Error('Cart ID is required to place order');
      }

      // Check if all steps are completed
      const incompleteSteps = getIncompleteSteps();
      if (incompleteSteps.length > 0) {
        const stepIds = incompleteSteps.map((step) => step.id).join(', ');
        throw new Error(`Cannot place order: incomplete steps [${stepIds}]`);
      }

      dispatch({ type: 'SET_PLACING_ORDER', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

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
    } catch (error) {
      const checkoutError: CheckoutError = {
        type:
          error instanceof Error && error.message.includes('incomplete steps')
            ? 'CHECKOUT_STEP_ERROR'
            : 'PLACE_ORDER_ERROR',
        message:
          error instanceof Error ? error.message : _('Failed to place order'),
        code:
          error instanceof Error && 'status' in error
            ? (error as any).status
            : undefined
      };

      dispatch({ type: 'SET_ERROR', payload: checkoutError });
      throw error;
    }
  }, [placeOrderApi, cartId, getIncompleteSteps]);

  // New checkout method with all data submission (cart.checkoutApi)
  const checkout = useCallback(async () => {
    try {
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
      dispatch({ type: 'CLEAR_ERROR' });

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
        throw new Error(json.error?.message || _('Failed to checkout'));
      }

      dispatch({
        type: 'SET_ORDER_PLACED',
        payload: { orderId: json.data.uuid }
      });

      return json.data;
    } catch (error) {
      const checkoutError: CheckoutError = {
        type:
          error instanceof Error && error.message.includes('incomplete steps')
            ? 'CHECKOUT_STEP_ERROR'
            : 'PLACE_ORDER_ERROR',
        message:
          error instanceof Error ? error.message : _('Failed to checkout'),
        code:
          error instanceof Error && 'status' in error
            ? (error as any).status
            : undefined
      };
      enableForm();
      dispatch({ type: 'SET_ERROR', payload: checkoutError });
      throw error;
    }
  }, [
    cartState.data?.checkoutApi,
    cartId,
    getIncompleteSteps,
    state.checkoutData
  ]);

  // Error management
  const setError = useCallback((error: CheckoutError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetCheckout = useCallback(() => {
    dispatch({ type: 'RESET_CHECKOUT' });
  }, []);

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

  // Context values
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
      setError,
      clearError,
      resetCheckout,
      addStep,
      removeStep,
      completeStep,
      clearSteps,
      getSteps,
      getIncompleteSteps,
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
      setError,
      clearError,
      resetCheckout,
      addStep,
      removeStep,
      completeStep,
      clearSteps,
      getSteps,
      getIncompleteSteps,
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

// Custom hooks
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

// Export types for consumers
export type {
  PaymentMethod,
  ShippingMethod,
  ShippingAddressParams,
  CheckoutError,
  CheckoutState,
  CheckoutStep
};
