process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import '../basicSetup.js';
import { describe, expect, it } from '@jest/globals';
import { addProcessor } from '../../../../lib/util/registry.js';
import { Cart } from '../../services/cart/Cart.js';
import { validateBeforeCreateOrder } from '../../services/orderValidator.js';

config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

const BILLING_ERROR = 'Billing address is required';

// A free product for building genuine zero-total carts.
const FREE_PRODUCT_ID = 998;
addProcessor(
  'cartItemProductLoaderFunction',
  (previousLoader) => async (id) =>
    id === FREE_PRODUCT_ID
      ? {
          product_id: FREE_PRODUCT_ID,
          name: 'Free product',
          sku: 'FREE2',
          price: 0,
          status: true,
          qty: 100,
          tax_class: 1
        }
      : previousLoader(id)
);

describe('billingAddress order validation rule', () => {
  it('requires a billing address for a paid order', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(1, 1); // fixture product, price 100
    expect(cart.getData('grand_total')).toBeGreaterThan(0);
    const result = await validateBeforeCreateOrder(cart);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BILLING_ERROR);
  });

  it('passes for a paid order once a billing address is set', async () => {
    // Stub cart: setting billing_address_id on a real Cart triggers the
    // billing_address resolver's DB query, which the test env has no DB for.
    const stub = {
      hasError: () => false,
      getItems: () => [{}],
      getData(key) {
        if (key === 'grand_total') return 100;
        if (key === 'billing_address_id') return 12;
        if (key === 'no_shipping_required') return true;
        return undefined;
      }
    };
    const result = await validateBeforeCreateOrder(stub);
    expect(result.errors).not.toContain(BILLING_ERROR);
    expect(result.valid).toBe(true);
  });

  it('does not require a billing address for a zero-total order', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(FREE_PRODUCT_ID, 1);
    expect(cart.getData('grand_total')).toEqual(0);
    const result = await validateBeforeCreateOrder(cart);
    expect(result.errors).not.toContain(BILLING_ERROR);
  });

  it('still accepts a billing address on a zero-total order', async () => {
    const stub = {
      hasError: () => false,
      getItems: () => [{}],
      getData(key) {
        if (key === 'grand_total') return 0;
        if (key === 'billing_address_id') return 12;
        if (key === 'no_shipping_required') return true;
        return undefined;
      }
    };
    const result = await validateBeforeCreateOrder(stub);
    expect(result.errors).not.toContain(BILLING_ERROR);
  });

  it('requires billing when grand_total is unreadable (promotion module absent)', async () => {
    // A cart whose grand_total field doesn't exist (getData throws) must fall
    // back to requiring billing — the zero exemption never fires blind.
    const stub = {
      getData(key) {
        if (key === 'grand_total') {
          throw new Error('Field grand_total not existed');
        }
        return undefined;
      }
    };
    const result = await validateBeforeCreateOrder(stub);
    expect(result.errors).toContain(BILLING_ERROR);
  });
});
