import { describe, expect, it } from '@jest/globals';
import { wasOrderPlaced } from '../../services/importOrder.js';

/**
 * An order that already happened gets `placed_at` when its `order_placed` was
 * emitted: importOrder uses this rule, and oms migration 1.0.11 the same one
 * in SQL for the orders already in the store (the migration's test runs these
 * cases through both).
 */
describe('wasOrderPlaced', () => {
  it.each([
    // payment status, payment transactions, payment method, placed
    ['pending', 0, 'stripe', false],
    ['canceled', 0, 'stripe', false], // canceled before any payment
    ['stripe_failed', 0, 'stripe', false], // may still succeed later
    ['paypal_failed', 1, 'paypal', true], // went pending, then failed
    ['canceled', 1, 'stripe', true], // paid, then canceled
    ['canceled', 0, 'cod', true], // COD is placed when created
    ['pending', 0, 'cod', true],
    ['cod_pending', 0, 'cod', true],
    ['paid', 0, 'zero_checkout', true],
    ['paid', 0, undefined, true],
    ['stripe_captured', 1, 'stripe', true],
    ['paypal_pending', 1, 'paypal', true],
    ['stripe_refunded', 0, 'stripe', true]
  ] as Array<[string, number, string | undefined, boolean]>)(
    '%s, %i transaction(s), %s: %s',
    (paymentStatus, transactions, method, placed) => {
      expect(wasOrderPlaced(paymentStatus, transactions, method)).toBe(placed);
    }
  );
});
