import { produce } from 'immer';
import React, {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  useCallback
} from 'react';
import { ApiResponse } from 'src/types/apiResponse.js';
import { useQuery, useClient } from 'urql';
import { _ } from '../../../lib/locale/translate/_.js';
import {
  CustomerAddressGraphql,
  Address
} from '../../../types/customerAddress.js';

const CartQuery = `
  query Query {
    myCart {
      uuid
      totalQty
      customerId
      customerGroupId
      customerEmail
      customerFullName
      coupon
      shippingMethod
      shippingMethodName
      paymentMethod
      paymentMethodName
      currency
      shippingNote
      addItemApi
      addPaymentMethodApi
      addShippingMethodApi
      addContactInfoApi
      addAddressApi
      addNoteApi
      checkoutApi
      applyCouponApi
      removeCouponApi
      taxAmount {
        value
        text
      } 
      discountAmount {
        value
        text
      }
      shippingFeeExclTax {
        value
        text
      }
      shippingFeeInclTax {
        value
        text
      }
      subTotal {
        value
        text
      }
      subTotalInclTax {
        value
        text
      }
      grandTotal {
        value
        text
      }
      availableShippingMethods {
        code
        name
        cost {
          value
          text
        }
      }
      availablePaymentMethods {
        code
        name
      }
      billingAddress {
        fullName
        telephone
        address1
        address2
        city
        province {
          name
          code
        }
        country {
          name
          code
        }
        postcode
      }
      shippingAddress {
        fullName
        telephone
        address1
        address2
        city
        province {
          name
          code
        }
        country {
          name
          code
        }
        postcode
      }
      items {
        cartItemId
        thumbnail
        qty
        productName
        productSku
        variantOptions {
          attributeCode
          attributeName
          attributeId
          optionId
          optionText
        }
        productUrl
        productPrice {
          value
          text
        }
        productPriceInclTax {
          value
          text
        }
        finalPrice {
          value
          text
        }
        finalPriceInclTax {
          value
          text
        }
        lineTotal {
          value
          text
        }
        lineTotalInclTax {
          value
          text
        }
        removeApi
        updateQtyApi
        errors
      }
    }
  }
`;

const ShippingMethodsQuery = `
  query GetCartShippingMethods($country: String!, $province: String, $postcode: String) {
    myCart {
      availableShippingMethods(country: $country, province: $province, postcode: $postcode) {
        code
        name
        cost {
          value
          text
        }
      }
    }
  }
`;
// --- TYPE DEFINITIONS ---

// Base interfaces that can be extended
export interface CartItem {
  cartItemId: string; // Changed from 'id' to match GraphQL response
  qty: number;
  productSku: string;
  productName: string;
  productUrl: string;
  thumbnail?: string; // Added from GraphQL response
  variantOptions?: {
    attributeCode: string;
    attributeName: string;
    attributeId: number;
    optionId: number;
    optionText: string;
  }[]; // Changed from 'string' to match GraphQL response
  productPrice: {
    value: number;
    text: string;
  };
  productPriceInclTax: {
    value: number;
    text: string;
  };
  finalPrice: {
    value: number;
    text: string;
  };
  finalPriceInclTax: {
    value: number;
    text: string;
  };
  lineTotal: {
    value: number;
    text: string;
  };
  lineTotalInclTax: {
    value: number;
    text: string;
  };
  removeApi: string; // API endpoint to remove item from cart
  updateQtyApi: string; // API endpoint to update item quantity
  errors?: any[]; // Added from GraphQL response
  virtual?: boolean; // Virtual products don't require shipping
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  price: number;
}

export interface ShippingAddressParams {
  country: string;
  province?: string;
  postcode?: string;
}

export interface CartError {
  field?: string;
  message: string;
  code?: string;
}

// Extensible cart data interface - third-party extensions can add any fields from server-side cart data
export interface CartData {
  uuid?: string; // Cart unique identifier (changed from 'id' to match GraphQL)
  totalQty: number; // Changed from 'totalItems' to match GraphQL
  customerId?: number; // Optional customer ID
  customerGroupId?: number; // Optional customer group ID
  customerEmail?: string; // Optional customer email
  customerFullName?: string; // Optional customer full name
  coupon?: string; // Coupon code applied to cart
  shippingMethod?: string; // Selected shipping method ID
  shippingMethodName?: string; // Selected shipping method name
  paymentMethod?: string; // Selected payment method ID
  paymentMethodName?: string; // Selected payment method name
  currency: string; // Currency code
  shippingNote?: string; // Shipping note
  addItemApi: string; // API endpoint to add item to cart
  addPaymentMethodApi: string; // API endpoint to add payment method
  addShippingMethodApi: string; // API endpoint to add shipping method
  addContactInfoApi: string; // API endpoint to add contact info
  addAddressApi: string; // API endpoint to add address
  addNoteApi: string; // API endpoint to add note
  applyCouponApi: string; // API endpoint to apply coupon
  checkoutApi: string; // API endpoint to perform checkout
  removeCouponApi?: string; // API endpoint to remove coupon
  items: CartItem[];
  subTotal: {
    value: number;
    text: string;
  };
  subTotalInclTax: {
    value: number;
    text: string;
  };
  grandTotal: {
    value: number;
    text: string;
  };
  taxAmount: {
    value: number;
    text: string;
  };
  discountAmount: {
    value: number;
    text: string;
  };
  shippingFeeExclTax: {
    value: number;
    text: string;
  };
  shippingFeeInclTax: {
    value: number;
    text: string;
  };
  availablePaymentMethods: {
    code: string;
    name: string;
  }[]; // Available payment methods from GraphQL
  availableShippingMethods: {
    code: string;
    name: string;
    cost?: {
      value: number;
      text: string;
    };
  }[]; // Available shipping methods from GraphQL (requires country/province)
  billingAddress?: CustomerAddressGraphql;
  shippingAddress?: CustomerAddressGraphql;
  errors: CartError[];
  error: string | null;
  [extendedFields: string]: any; // Allow third-party extensions to add fields
}

// Complete cart state with detailed loading states
export interface CartState {
  data: CartData; // Cart data, can be undefined if not initialized
  loading: boolean; // Overall loading state (true if any operation is loading) - derived from loadingStates
  loadingStates: {
    addingItem: boolean;
    removingItem: string | null; // Item ID being removed, null if none
    updatingItem: string | null; // Item ID being updated, null if none
    addingPaymentMethod: boolean;
    addingShippingMethod: boolean;
    addingShippingAddress: boolean;
    addingBillingAddress: boolean;
    addingContactInfo: boolean;
    applyingCoupon: boolean;
    removingCoupon: boolean;
    fetchingShippingMethods: boolean; // New loading state for fetching shipping methods
    syncing: boolean; // Cart sync with server
  };
}

// Action type for cart operations
type CartAction =
  | { type: 'SET_CART'; payload: Partial<CartData> }
  | {
      type: 'SET_SPECIFIC_LOADING';
      payload: {
        operation: keyof CartState['loadingStates'];
        loading: boolean;
        itemId?: string;
      };
    }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// The shape of the functions that will be returned by the useCartDispatch hook
interface CartDispatch {
  addItem: (payload: { sku: string; qty: number }) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateItem: (
    itemId: string,
    payload: { qty: number; action: 'increase' | 'decrease' }
  ) => Promise<void>;
  addPaymentMethod: (code: string, name: string) => Promise<void>;
  addShippingMethod: (code: string, name: string) => Promise<void>;
  addShippingAddress: (address: Address) => Promise<void>;
  addBillingAddress: (address: Address) => Promise<void>;
  addContactInfo: (contactInfo: { email: string }) => Promise<void>;
  applyCoupon: (couponCode: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  clearError: () => void;
  isShippingRequired: () => boolean;
  isReadyForCheckout: () => boolean;
  getErrors: () => CartError[];
  getId: () => string | null;
  fetchAvailableShippingMethods: (
    params: ShippingAddressParams
  ) => Promise<void>;
  syncCartWithServer: (serverResponse?: any) => Promise<void>; // Added GraphQL sync function
}

// --- INITIAL STATE ---

// Simple reducer with detailed loading states
const cartReducer = (state: CartState, action: CartAction): CartState => {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'SET_CART':
        if (draft.data) {
          Object.assign(draft.data, action.payload);
          draft.data.error = null;
        } else {
          draft.data = action.payload as CartData;
        }
        // Clear all loading states when cart is set
        draft.loadingStates = {
          addingItem: false,
          removingItem: null,
          updatingItem: null,
          addingPaymentMethod: false,
          addingShippingMethod: false,
          addingShippingAddress: false,
          addingBillingAddress: false,
          addingContactInfo: false,
          applyingCoupon: false,
          removingCoupon: false,
          fetchingShippingMethods: false,
          syncing: false
        };
        draft.loading = false;
        break;

      case 'SET_SPECIFIC_LOADING':
        const { operation, loading, itemId } = action.payload;
        if (operation === 'removingItem' || operation === 'updatingItem') {
          draft.loadingStates[operation] = loading ? itemId || null : null;
        } else {
          (draft.loadingStates as any)[operation] = loading;
        }
        // Update overall loading state based on loadingStates
        draft.loading = Object.values(draft.loadingStates).some(
          (state) =>
            state === true || (typeof state === 'string' && state !== null)
        );
        break;

      case 'SET_ERROR':
        if (draft.data) {
          draft.data.error = action.payload;
        }
        // Clear all loading states on error
        draft.loadingStates = {
          addingItem: false,
          removingItem: null,
          updatingItem: null,
          addingPaymentMethod: false,
          addingShippingMethod: false,
          addingShippingAddress: false,
          addingBillingAddress: false,
          addingContactInfo: false,
          applyingCoupon: false,
          removingCoupon: false,
          fetchingShippingMethods: false,
          syncing: false
        };
        draft.loading = false;
        break;

      case 'CLEAR_ERROR':
        if (draft.data) {
          draft.data.error = null;
          draft.data.errors = [];
        }
        break;
    }
  });
}; // --- CONTEXT DEFINITION ---

const CartStateContext = createContext<CartState | undefined>(undefined);
const CartDispatchContext = createContext<CartDispatch | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
  cart?: CartData;
  addMineCartItemApi: string;
}

export const CartProvider = ({
  children,
  cart,
  addMineCartItemApi
}: CartProviderProps) => {
  const client = useClient(); // Get urql client for GraphQL queries

  const hydratedInitialState: CartState = {
    data: cart
      ? cart
      : {
          currency: 'USD',
          items: [],
          totalQty: 0,
          billingAddress: undefined,
          shippingAddress: undefined,
          errors: [],
          error: null,
          subTotal: { value: 0, text: '0.00' },
          subTotalInclTax: { value: 0, text: '0.00' },
          shippingFeeExclTax: { value: 0, text: '0.00' },
          shippingFeeInclTax: { value: 0, text: '0.00' },
          grandTotal: { value: 0, text: '0.00' },
          taxAmount: { value: 0, text: '0.00' },
          discountAmount: { value: 0, text: '0.00' },
          coupon: '',
          addItemApi: addMineCartItemApi, // API endpoint to add items to cart
          addPaymentMethodApi: '', // Will be set by server
          addShippingMethodApi: '', // Will be set by server
          addAddressApi: '', // Will be set by server
          applyCouponApi: '', // Will be set by server
          addNoteApi: '', // Will be set by server
          addContactInfoApi: '', // Will be set by server
          checkoutApi: '', // Will be set by server
          availablePaymentMethods: [],
          availableShippingMethods: []
        },
    loading: false,
    loadingStates: {
      addingItem: false,
      removingItem: null,
      updatingItem: null,
      addingPaymentMethod: false,
      addingShippingMethod: false,
      addingShippingAddress: false,
      addingBillingAddress: false,
      addingContactInfo: false,
      applyingCoupon: false,
      removingCoupon: false,
      fetchingShippingMethods: false,
      syncing: false
    }
  };

  const [state, dispatch] = useReducer(cartReducer, hydratedInitialState);

  // Use urql to query cart data
  const [cartQueryResult, refetchCart] = useQuery({
    query: CartQuery,
    pause: !state.data?.uuid // Only query if we have a cart UUID
  });

  // --- UTILITY FUNCTIONS ---

  const retry = async function <T>(
    fn: () => Promise<T>,
    retries = 2,
    delay = 1000
  ): Promise<T> {
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

  const syncCartWithServer = useCallback(async (): Promise<void> => {
    try {
      dispatch({
        type: 'SET_SPECIFIC_LOADING',
        payload: { operation: 'syncing', loading: true }
      });
      await refetchCart({ requestPolicy: 'network-only' });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to sync cart'
      });
    } finally {
      dispatch({
        type: 'SET_SPECIFIC_LOADING',
        payload: { operation: 'syncing', loading: false }
      });
    }
  }, [refetchCart]);

  // Effect to update cart when GraphQL query result changes
  React.useEffect(() => {
    if (cartQueryResult.data?.myCart) {
      const serverCart = cartQueryResult.data.myCart;
      dispatch({
        type: 'SET_CART',
        payload: serverCart
      });
    }
  }, [cartQueryResult.data]);

  React.useEffect(() => {
    if (cart && JSON.stringify(cart) !== JSON.stringify(state.data)) {
      dispatch({ type: 'SET_CART', payload: cart });
    }
  }, [cart]);

  const addItem = useCallback(
    async (payload: { sku: string; qty: number }) => {
      if (!state.data) {
        throw new Error('Cannot add item: cart not initialized');
      }

      try {
        // Set specific loading state
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingItem', loading: true }
        });

        // Server request with retry
        const response = await retry(() =>
          fetch(state.data!.addItemApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        );

        const json = (await response.json()) as ApiResponse<CartData>;

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to add item.');
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to add item'
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingItem', loading: false }
        });
      }
    },
    [state.data?.addItemApi, syncCartWithServer]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!state.data) {
        throw new Error('Cannot remove item: cart not initialized');
      }

      const item = state.data.items.find((item) => item.cartItemId === itemId);
      if (!item) {
        throw new Error('Item not found in cart');
      }

      try {
        // Set specific loading state for this item
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'removingItem', loading: true, itemId }
        });

        // Server request with retry using item's remove API
        const response = await retry(() =>
          fetch(item.removeApi, {
            method: 'DELETE'
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to remove item.');
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'Failed to remove item'
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'removingItem', loading: false }
        });
      }
    },
    [state, syncCartWithServer]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      payload: { qty: number; action: 'increase' | 'decrease' }
    ) => {
      if (!state.data) {
        throw new Error('Cannot update item: cart not initialized');
      }

      const item = state.data.items.find((item) => item.cartItemId === itemId);
      if (!item) {
        throw new Error('Item not found in cart');
      }

      try {
        // Set specific loading state for this item
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'updatingItem', loading: true, itemId }
        });

        // Server request with retry using item's update API
        const response = await retry(() =>
          fetch(item.updateQtyApi, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to update item.');
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'Failed to update item'
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'updatingItem', loading: false }
        });
      }
    },
    [state, syncCartWithServer]
  );

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Add payment method
  const addPaymentMethod = useCallback(
    async (code: string, name: string) => {
      if (!state.data) {
        throw new Error(_('Cannot add payment method: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingPaymentMethod', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.addPaymentMethodApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method_code: code, method_name: name })
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message || _('Failed to add payment method.')
          );
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : _('Failed to add payment method')
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingPaymentMethod', loading: false }
        });
      }
    },
    [state.data?.addPaymentMethodApi, syncCartWithServer]
  );

  // Add shipping method
  const addShippingMethod = useCallback(
    async (code: string, name: string) => {
      if (!state.data) {
        throw new Error(_('Cannot add shipping method: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingShippingMethod', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.addShippingMethodApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method_code: code, method_name: name })
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message || _('Failed to add shipping method.')
          );
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : _('Failed to add shipping method')
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingShippingMethod', loading: false }
        });
      }
    },
    [state.data?.addShippingMethodApi, syncCartWithServer]
  );

  // Add shipping address
  const addShippingAddress = useCallback(
    async (address: Address) => {
      if (!state.data) {
        throw new Error(_('Cannot add shipping address: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingShippingAddress', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.addAddressApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: { ...address }, type: 'shipping' })
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message || _('Failed to add shipping address.')
          );
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : _('Failed to add shipping address')
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingShippingAddress', loading: false }
        });
      }
    },
    [state.data?.addAddressApi, syncCartWithServer]
  );

  // Add billing address
  const addBillingAddress = useCallback(
    async (address: Address) => {
      if (!state.data) {
        throw new Error(_('Cannot add billing address: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingBillingAddress', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.addAddressApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: { ...address }, type: 'billing' })
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message || _('Failed to add billing address.')
          );
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : _('Failed to add billing address')
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingBillingAddress', loading: false }
        });
      }
    },
    [state.data?.addAddressApi, syncCartWithServer]
  );

  // Add contact info
  const addContactInfo = useCallback(
    async (contactInfo: { email: string }) => {
      if (!state.data) {
        throw new Error(_('Cannot add contact info: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingContactInfo', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.addContactInfoApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactInfo)
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message || _('Failed to add contact info.')
          );
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : _('Failed to add contact info')
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'addingContactInfo', loading: false }
        });
      }
    },
    [state.data?.addContactInfoApi, syncCartWithServer]
  );

  // Apply coupon
  const applyCoupon = useCallback(
    async (couponCode: string) => {
      if (!state.data) {
        throw new Error(_('Cannot apply coupon: cart not initialized'));
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'applyingCoupon', loading: true }
        });

        const response = await retry(() =>
          fetch(state.data!.applyCouponApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupon: couponCode })
          })
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to apply coupon.');
        }

        // Sync with server (both immediate update and GraphQL refetch)
        await syncCartWithServer();
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'Failed to apply coupon'
        });
        throw error;
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'applyingCoupon', loading: false }
        });
      }
    },
    [state.data?.applyCouponApi, syncCartWithServer]
  );

  // Remove coupon
  const removeCoupon = useCallback(async () => {
    if (!state.data) {
      throw new Error(_('Cannot remove coupon: cart not initialized'));
    }
    if (!state.data?.removeCouponApi) {
      throw new Error(_('No coupon to remove'));
    }

    try {
      dispatch({
        type: 'SET_SPECIFIC_LOADING',
        payload: { operation: 'removingCoupon', loading: true }
      });

      const response = await retry(() =>
        fetch(state.data!.removeCouponApi as string, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message || _('Failed to remove coupon.'));
      }

      // Sync with server (both immediate update and GraphQL refetch)
      await syncCartWithServer();
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload:
          error instanceof Error ? error.message : _('Failed to remove coupon')
      });
      throw error;
    } finally {
      dispatch({
        type: 'SET_SPECIFIC_LOADING',
        payload: { operation: 'removingCoupon', loading: false }
      });
    }
  }, [state.data?.removeCouponApi, syncCartWithServer]);

  // Check if shipping is required
  const isShippingRequired = useCallback(() => {
    if (!state.data) return false;
    return state.data.items.some((item) => !item.virtual);
  }, [state.data?.items]);

  // Check if cart is ready for checkout
  const isReadyForCheckout = useCallback(() => {
    if (!state.data) return false;

    const hasItems = state.data.items.length > 0;
    const hasBillingAddress = !!state.data.billingAddress;
    const hasShippingAddress =
      !isShippingRequired() || !!state.data.shippingAddress;
    const noErrors = state.data.errors.length === 0;

    return hasItems && hasBillingAddress && hasShippingAddress && noErrors;
  }, [state.data, isShippingRequired]);

  // Get validation errors
  const getErrors = useCallback(() => {
    return state.data?.errors ?? [];
  }, [state.data?.errors]);

  // Get cart ID
  const getId = useCallback(() => {
    return state.data?.uuid ?? null;
  }, [state.data?.uuid]);

  // Fetch available shipping methods based on address parameters and update cart state
  const fetchAvailableShippingMethods = useCallback(
    async (params: ShippingAddressParams) => {
      if (!state.data?.uuid) {
        throw new Error('Cannot fetch shipping methods: cart not initialized');
      }

      try {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'fetchingShippingMethods', loading: true }
        });

        const result = await client
          .query(ShippingMethodsQuery, {
            country: params.country,
            province: params.province || null,
            postcode: params.postcode || null
          })
          .toPromise();

        if (result.error) {
          throw new Error(
            result.error.message || 'Failed to fetch shipping methods'
          );
        }

        // Update cart state with new shipping methods
        if (result.data?.myCart?.availableShippingMethods) {
          dispatch({
            type: 'SET_CART',
            payload: {
              availableShippingMethods:
                result.data.myCart.availableShippingMethods
            }
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch shipping methods';

        dispatch({
          type: 'SET_ERROR',
          payload: errorMessage
        });

        throw new Error(errorMessage);
      } finally {
        dispatch({
          type: 'SET_SPECIFIC_LOADING',
          payload: { operation: 'fetchingShippingMethods', loading: false }
        });
      }
    },
    [state.data?.uuid, client]
  );

  const cartDispatch: CartDispatch = {
    addItem,
    removeItem,
    updateItem,
    addPaymentMethod,
    addShippingMethod,
    addShippingAddress,
    addBillingAddress,
    addContactInfo,
    applyCoupon,
    removeCoupon,
    clearError,
    isShippingRequired,
    isReadyForCheckout,
    getErrors,
    getId,
    fetchAvailableShippingMethods,
    syncCartWithServer
  };

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={cartDispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
};

// --- CUSTOM HOOKS ---

export const useCartState = (): CartState => {
  const context = useContext(CartStateContext);
  if (context === undefined) {
    throw new Error('useCartState must be used within a CartProvider');
  }
  return context;
};

export const useCartDispatch = (): CartDispatch => {
  const context = useContext(CartDispatchContext);
  if (context === undefined) {
    throw new Error('useCartDispatch must be used within a CartProvider');
  }
  return context;
};

/*
 * SIMPLIFIED CART WITH GRANULAR LOADING STATES & EXTENSIBILITY
 *
 * This cart system provides:
 * 1. SERVER-SIDE DRIVEN EXTENSIBILITY - Extensions add fields to cart data from server
 * 2. GRANULAR + DERIVED LOADING STATES - Track specific operations + overall loading
 * 3. UNIQUE CART ID - Every cart has a persistent identifier
 * 4. SERVER-AUTHORITATIVE STATE - All cart mutations sync with server for up-to-date data
 *
 * === CART STRUCTURE ===
 *
 * The cart state contains:
 * - `data`: Contains all cart information (items, totals, addresses, extensions, etc.)
 * - `loading`: Overall loading state (automatically derived from loadingStates)
 * - `loadingStates`: Granular loading states for specific operations
 *
 * === HOW TO ACCESS CART DATA ===
 *
 * function MyCartComponent() {
 *   const cartState = useCartState();
 *   const cartDispatch = useCartDispatch();
 *
 *   // Access cart data
 *   const items = cartState.data?.items ?? [];
 *   const total = cartState.data?.grandTotal;
 *   const cartId = cartDispatch.getId(); // Get unique cart ID
 *   const isLoading = cartState.loading; // Overall loading state (derived)
 *   const { loadingStates } = cartState; // Granular loading states
 *
 *   const handleAddItem = async () => {
 *     await cartDispatch.addItem({ sku: 'ABC123', quantity: 1 });
 *     // Cart automatically syncs with GraphQL after REST mutation
 *   };
 *
 *   const handleManualSync = async () => {
 *     await cartDispatch.syncCartWithServer();
 *     // Force sync with GraphQL without a REST response
 *   };
 *
 *   // NEW: Fetch shipping methods based on address and update cart state
 *   const handleFetchShippingMethods = async () => {
 *     try {
 *       await cartDispatch.fetchAvailableShippingMethods({
 *         country: 'US',
 *         province: 'CA',
 *         postcode: '90210'
 *       });
 *       // Cart state is automatically updated with new shipping methods
 *       console.log('Shipping methods updated in cart state');
 *     } catch (error) {
 *       console.error('Failed to fetch shipping methods:', error);
 *     }
 *   };
 *
 *   // Access shipping/payment methods directly from state
 *   const availableShippingMethods = cartState.data?.availableShippingMethods || [];
 *   const availablePaymentMethods = cartState.data?.availablePaymentMethods || [];
 *
 *   return (
 *     <div>
 *       <p>Cart ID: {cartId}</p>
 *       <p>Items: {items.length}</p>
 *       <p>Total: ${total?.text}</p>
 *       <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
 *       <p>Available Shipping Methods: {availableShippingMethods.length}</p>
 *       <p>Available Payment Methods: {availablePaymentMethods.length}</p>
 *       {loadingStates.addingItem && <div className="spinner">Adding item...</div>}
 *       {loadingStates.fetchingShippingMethods && <div className="spinner">Fetching shipping methods...</div>}
 *       {loadingStates.syncing && <div className="spinner">Syncing...</div>}
 *       {isLoading && <div className="overlay">Something is loading...</div>}
 *       <button onClick={handleFetchShippingMethods}>Update Shipping Methods</button>
 *     </div>
 *   );
 * }
 *
 * === LOADING STATE BEHAVIOR ===
 *
 * The loading state is automatically derived from granular states:
 * - `loading`: true if ANY operation in loadingStates is active, false otherwise
 * - `loadingStates`: Individual states for specific operations:
 *   - `addingItem`: true during item addition
 *   - `removingItem`: string (item ID) during item removal, null otherwise
 *   - `updatingItem`: string (item ID) during item update, null otherwise
 *   - `addingPaymentMethod`: true during payment method addition
 *   - `addingShippingMethod`: true during shipping method addition
 *   - `addingShippingAddress`: true during shipping address addition
 *   - `addingBillingAddress`: true during billing address addition
 *   - `addingContactInfo`: true during contact info addition
 *   - `applyingCoupon`: true during coupon application
 *   - `removingCoupon`: true during coupon removal
 *   - `fetchingShippingMethods`: true during dynamic shipping methods fetch
 *   - `syncing`: true during cart sync with server
 *
 * === SERVER-AUTHORITATIVE APPROACH ===
 *
 * All cart operations follow this pattern:
 * 1. Set specific loading state to true (loading automatically becomes true)
 * 2. Make REST API call to server
 * 3. Use syncCartWithServer() to get authoritative cart state
 * 4. Server response updates local state and triggers GraphQL refetch
 * 5. Specific loading state becomes false (loading automatically becomes false if no other operations)
 *
 * This ensures the UI always reflects the server's authoritative cart state.
 *
 * === THIRD-PARTY EXTENSIBILITY ===
 *
 * Extensions work by adding fields to server-side cart data:
 *
 * 1. Server-side extension adds fields to cart data:
 *    {
 *      "data": {
 *        "cart": {
 *          "id": "cart_123",
 *          "items": [...],
 *          "totals": {...},
 *          "loyaltyPoints": 150,           // <- Extension field
 *          "subscriptionId": "sub_123",   // <- Extension field
 *          "giftWrapEnabled": true,       // <- Extension field
 *          "membershipTier": "gold"       // <- Extension field
 *        }
 *      }
 *    }
 *
 * 2. Frontend components access extension data:
 *    function MyLoyaltyComponent() {
 *      const cartState = useCartState();
 *      const loyaltyPoints = cartState.data.loyaltyPoints;
 *      const membershipTier = cartState.data.membershipTier;
 *
 *      return (
 *        <div>
 *          <p>Loyalty Points: {loyaltyPoints}</p>
 *          <p>Member Tier: {membershipTier}</p>
 *          {cartState.loading && <p>Updating...</p>}
 *          {cartState.loadingStates.syncing && <p>Syncing cart...</p>}
 *        </div>
 *      );
 *    }
 *
 * 3. Extensions can use both general and specific loading states:
 *    function CartControls() {
 *      const cartState = useCartState();
 *      const cartDispatch = useCartDispatch();
 *      const { loadingStates, loading } = cartState;
 *
 *      return (
 *        <div>
 *          <button
 *            onClick={() => cartDispatch.addItem({ sku: 'ABC123', quantity: 1 })}
 *            disabled={loadingStates.addingItem}
 *          >
 *            {loadingStates.addingItem ? 'Adding...' : 'Add to Cart'}
 *          </button>
 *
 *          <button
 *            onClick={() => cartDispatch.applyCoupon('SAVE10')}
 *            disabled={loadingStates.applyingCoupon}
 *          >
 *            {loadingStates.applyingCoupon ? 'Applying...' : 'Apply Coupon'}
 *          </button>
 *
 *          {loading && <div className="loading-overlay">Cart updating...</div>}
 *        </div>
 *      );
 *    }
 *
 * === BENEFITS ===
 *
 * ✅ Best of Both Worlds: Granular states + overall loading for backward compatibility
 * ✅ Automatic Synchronization: Overall loading derived from granular states
 * ✅ Single Source of Truth: All loading controlled through SET_SPECIFIC_LOADING
 * ✅ Server-Authoritative: Always reflects the true server state
 * ✅ Server-Side Extensions: Extensions just add fields to server response
 * ✅ Unique Cart ID: Every cart has a persistent identifier
 * ✅ Precise Loading States: Know exactly what operation is in progress
 * ✅ Item-Specific States: Track loading for individual items
 * ✅ Error Handling: Proper error states with server feedback
 * ✅ Extension Preservation: All extension fields maintained through operations
 * ✅ TypeScript Support: Full type safety with optional extension declarations
 * ✅ GraphQL Sync: Automatic sync with GraphQL after REST mutations
 */
