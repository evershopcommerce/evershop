process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import '../basicSetup.js';
import { describe, expect, it, jest } from '@jest/globals';
import { addProcessor, getValueSync } from '../../../../lib/util/registry.js';
import { ValidatorManager } from '../../../../lib/util/validator.js';
import { Cart } from '../../services/cart/Cart.js';
import {
  getAvailablePaymentMethods,
  registerPaymentMethod,
  ZERO_CHECKOUT_CODE
} from '../../services/getAvailablePaymentMethods.js';
import { validateBeforeCreateOrder } from '../../services/orderValidator.js';
import {
  markZeroCheckoutOrderPaid,
  registerZeroCheckoutOrderValidation,
  registerZeroCheckoutPaymentMethod
} from '../../services/zeroCheckout.js';

config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

// Register once for the whole file (jest isolates the registry per test file).
registerZeroCheckoutPaymentMethod();
registerZeroCheckoutOrderValidation();
registerPaymentMethod({
  init: () => ({ code: 'test_normal', name: 'Normal Method' }),
  validator: () => true
});

// A free product for building genuine zero-total carts. Compose over the
// harness loader instead of mutating the shared fixture list.
const FREE_PRODUCT_ID = 999;
addProcessor(
  'cartItemProductLoaderFunction',
  (previousLoader) => async (id) =>
    id === FREE_PRODUCT_ID
      ? {
          product_id: FREE_PRODUCT_ID,
          name: 'Free product',
          sku: 'FREE1',
          price: 0,
          status: true,
          qty: 100,
          tax_class: 1
        }
      : previousLoader(id)
);

function stubCart({ grandTotal, paymentMethod, grandTotalThrows = false }) {
  return {
    getData(key) {
      if (key === 'grand_total') {
        if (grandTotalThrows) {
          throw new Error('Field grand_total not existed');
        }
        return grandTotal;
      }
      if (key === 'payment_method') {
        return paymentMethod;
      }
      return undefined;
    }
  };
}

function getZeroRules() {
  const manager = getValueSync(
    'orderValidator',
    () => new ValidatorManager([]),
    {},
    (value) => value instanceof ValidatorManager
  );
  return {
    zeroTotalRule: manager.getValidator('zeroTotalRequiresZeroCheckout'),
    zeroMethodRule: manager.getValidator('zeroCheckoutRequiresZeroTotal')
  };
}

describe('getAvailablePaymentMethods with cart context', () => {
  it('hides zero_checkout and keeps normal methods when no context is given (legacy behavior)', async () => {
    const codes = (await getAvailablePaymentMethods()).map((m) => m.code);
    expect(codes).toContain('test_normal');
    expect(codes).not.toContain(ZERO_CHECKOUT_CODE);
  });

  it('hides zero_checkout when the cart total is above 0', async () => {
    const codes = (await getAvailablePaymentMethods({ cartTotal: 50 })).map(
      (m) => m.code
    );
    expect(codes).toContain('test_normal');
    expect(codes).not.toContain(ZERO_CHECKOUT_CODE);
  });

  it('returns exactly zero_checkout when the cart total is 0', async () => {
    const methods = await getAvailablePaymentMethods({ cartTotal: 0 });
    expect(methods).toEqual([
      { code: ZERO_CHECKOUT_CODE, name: 'No payment required' }
    ]);
  });

  it('treats an explicit undefined cartTotal like no context', async () => {
    const codes = (
      await getAvailablePaymentMethods({ cartTotal: undefined })
    ).map((m) => m.code);
    expect(codes).toContain('test_normal');
    expect(codes).not.toContain(ZERO_CHECKOUT_CODE);
  });
});

describe('payment_method cart field gate', () => {
  it('accepts zero_checkout on a zero-total cart and resolves its display name', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    expect(cart.getData('grand_total')).toEqual(0);
    await cart.setData('payment_method', ZERO_CHECKOUT_CODE);
    expect(cart.getData('payment_method')).toEqual(ZERO_CHECKOUT_CODE);
    expect(cart.getData('payment_method_name')).toEqual('No payment required');
    expect(cart.hasError()).toBe(false);
  });

  it('rejects a normal method on a zero-total cart', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    await expect(
      cart.setData('payment_method', 'test_normal')
    ).rejects.toThrow();
  });

  it('rejects zero_checkout on a cart with a total above 0', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(1, 1); // fixture product, price 100
    expect(cart.getData('grand_total')).toBeGreaterThan(0);
    await expect(
      cart.setData('payment_method', ZERO_CHECKOUT_CODE)
    ).rejects.toThrow();
    await cart.setData('payment_method', 'test_normal');
    expect(cart.getData('payment_method')).toEqual('test_normal');
  });

  it('invalidates a selected zero_checkout when the total rises above 0', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    await cart.setData('payment_method', ZERO_CHECKOUT_CODE);
    expect(cart.hasError()).toBe(false);
    await cart.addItem(1, 1); // total is now 110 (100 + 10% tax)
    expect(cart.hasError()).toBe(true);
    expect(cart.getErrors()).toHaveProperty('payment_method');
  });
});

describe('placement-boundary validation rules', () => {
  it('blocks placing a zero-total order with no payment method set', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    const result = await validateBeforeCreateOrder(cart);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Zero-total orders must use the 'No payment required' payment method"
    );
  });

  it('does not raise the zero rules once zero_checkout is selected', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    await cart.setData('payment_method', ZERO_CHECKOUT_CODE);
    const result = await validateBeforeCreateOrder(cart);
    expect(result.errors).not.toContain(
      "Zero-total orders must use the 'No payment required' payment method"
    );
    expect(result.errors).not.toContain(
      "The 'No payment required' payment method cannot be used when the order total is greater than zero"
    );
  });

  it('zeroTotalRequiresZeroCheckout matrix', () => {
    const { zeroTotalRule } = getZeroRules();
    expect(
      zeroTotalRule.func(
        stubCart({ grandTotal: 0, paymentMethod: ZERO_CHECKOUT_CODE })
      )
    ).toBe(true);
    expect(
      zeroTotalRule.func(stubCart({ grandTotal: 0, paymentMethod: undefined }))
    ).toBe(false);
    expect(
      zeroTotalRule.func(stubCart({ grandTotal: 0, paymentMethod: null }))
    ).toBe(false);
    expect(
      zeroTotalRule.func(stubCart({ grandTotal: 0, paymentMethod: 'cod' }))
    ).toBe(false);
    // The total-above-0 methodless gap stays open by design (requirement 5).
    expect(
      zeroTotalRule.func(stubCart({ grandTotal: 50, paymentMethod: undefined }))
    ).toBe(true);
    // grand_total unreadable (promotion module absent) → rule not applicable.
    expect(
      zeroTotalRule.func(
        stubCart({ paymentMethod: undefined, grandTotalThrows: true })
      )
    ).toBe(true);
  });

  it('zeroCheckoutRequiresZeroTotal matrix', () => {
    const { zeroMethodRule } = getZeroRules();
    expect(
      zeroMethodRule.func(
        stubCart({ grandTotal: 50, paymentMethod: ZERO_CHECKOUT_CODE })
      )
    ).toBe(false);
    expect(
      zeroMethodRule.func(
        stubCart({ grandTotal: 0, paymentMethod: ZERO_CHECKOUT_CODE })
      )
    ).toBe(true);
    expect(
      zeroMethodRule.func(stubCart({ grandTotal: 50, paymentMethod: 'cod' }))
    ).toBe(true);
    // zero_checkout selected but the total is unknowable → refuse.
    expect(
      zeroMethodRule.func(
        stubCart({ paymentMethod: ZERO_CHECKOUT_CODE, grandTotalThrows: true })
      )
    ).toBe(false);
  });
});

describe('markZeroCheckoutOrderPaid', () => {
  it('ignores orders placed with other payment methods', async () => {
    const complete = jest.fn(async () => {});
    await markZeroCheckoutOrderPaid(
      { order_id: 1, payment_method: 'cod' },
      complete
    );
    await markZeroCheckoutOrderPaid(null, complete);
    expect(complete).not.toHaveBeenCalled();
  });

  it('completes zero-checkout orders', async () => {
    const complete = jest.fn(async () => {});
    await markZeroCheckoutOrderPaid(
      { order_id: 42, payment_method: ZERO_CHECKOUT_CODE },
      complete
    );
    expect(complete).toHaveBeenCalledWith(42);
  });

  it('swallows completion failures — the order is already committed', async () => {
    const complete = jest.fn(async () => {
      throw new Error('boom');
    });
    await expect(
      markZeroCheckoutOrderPaid(
        { order_id: 42, payment_method: ZERO_CHECKOUT_CODE },
        complete
      )
    ).resolves.toBeUndefined();
    expect(complete).toHaveBeenCalled();
  });
});
