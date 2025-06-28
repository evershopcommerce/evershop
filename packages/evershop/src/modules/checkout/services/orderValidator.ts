import { addProcessor, getValueSync } from '../../../lib/util/registry.js';
import { Validator, ValidatorManager } from '../../../lib/util/validator.js';
import { Cart } from './cart/Cart.js';

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
      if (!cart.getData('shipping_method')) {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Shipping method is required'
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
