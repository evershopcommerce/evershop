import { addProcessor, getValueSync } from '../../../lib/util/registry.js';
import { Validator, ValidatorManager } from '../../../lib/util/validator.js';
import { Cart } from './cart/Cart.js';
import { getAllowGuestCheckout } from './checkoutSettings.js';

const initialValidators: Validator<Cart>[] = [
  {
    id: 'checkCartError',
    /**
     *
     * @param {Cart} cart
     * @returns {boolean}
     */
    func: (cart: Cart) => {
      if (cart.hasError()) {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Cart has errors'
  },
  {
    id: 'checkEmpty',
    /**
     *
     * @param {Cart} cart
     * @returns
     */
    func: (cart: Cart) => {
      const items = cart.getItems();
      if (items.length === 0) {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Cart is empty'
  },
  {
    id: 'shippingAddress',
    /**
     *
     * @param {Cart} cart
     * @returns {boolean}
     */
    func: (cart: Cart) => {
      if (cart.getData('no_shipping_required')) {
        return true;
      }
      if (!cart.getData('shipping_address_id')) {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Shipping address is required'
  },
  {
    id: 'shippingMethod',
    /**
     *
     * @param {Cart} cart
     * @returns {boolean}
     */
    func: (cart: Cart) => {
      if (cart.getData('no_shipping_required')) {
        return true;
      }
      const data = cart.getData('shipping_method_data') as
        | { method_code?: string }
        | null
        | undefined;
      return Boolean(data?.method_code);
    },
    errorMessage: 'Shipping method is required'
  },
  {
    id: 'billingAddress',
    /**
     * Zero-total orders don't require a billing address — nothing is charged,
     * taxed, or invoiced. Every other order does; historically this was only
     * enforced by `saveOrder` crashing on the missing row. `grand_total` is
     * registered by the promotion module — if it's unreadable, keep requiring
     * billing (legacy behavior).
     * @param {Cart} cart
     * @returns {boolean}
     */
    func: (cart: Cart) => {
      let total;
      try {
        total = cart.getData('grand_total');
      } catch (e) {
        total = undefined;
      }
      if (typeof total === 'number' && !Number.isNaN(total) && total <= 0) {
        return true;
      }
      return Boolean(cart.getData('billing_address_id'));
    },
    errorMessage: 'Billing address is required'
  },
  {
    id: 'guestCheckout',
    /**
     * When guest checkout is disabled, an order can only be placed by an authenticated
     * customer. `customer_id` is populated from the session in the cartCheckout handler
     * (via `request.getCurrentCustomer()`), NOT from client input — so this is a real
     * authorization gate, not a spoofable value.
     * @param {Cart} cart
     * @returns {boolean}
     */
    func: (cart: Cart) => {
      if (getAllowGuestCheckout()) {
        return true;
      }
      return Boolean(cart.getData('customer_id'));
    },
    errorMessage: 'You must be logged in to place an order'
  }
];

export async function validateBeforeCreateOrder(
  cart: Cart
): Promise<{ valid: boolean; errors: string[] }> {
  const validator = getValueSync<ValidatorManager<Cart>>(
    'orderValidator',
    () => new ValidatorManager(initialValidators),
    {},
    (value) => value instanceof ValidatorManager
  );
  return await validator.validate(cart);
}

export function addOrderValidationRule(rule: Validator<Cart>): void {
  addProcessor('orderValidator', (validatorManager) => {
    if (validatorManager instanceof ValidatorManager) {
      validatorManager.add(rule);
      return validatorManager;
    } else {
      throw new Error('orderValidator must be an instance of ValidatorManager');
    }
  });
}
