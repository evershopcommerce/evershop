process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { registerPaymentMethod } from '../../../checkout/services/getAvailablePaymentMethods.js';
import resolvers from '../../graphql/types/Order/Order.admin.resolvers.js';

/**
 * `Order.canRefund` / `Order.canCapture` are the auto-detection behind the admin
 * refund / capture buttons. Each is true only when BOTH halves hold:
 *   - capability: the order's method registered that operation handler, and
 *   - state: the current payment status carries the matching flag
 *     (`isRefundable` / `isCapturable`).
 * This mirrors exactly what `refundOrder` / `captureOrder` enforce server-side,
 * so the button never offers an action the core route would reject.
 */

config.util.setModuleDefaults('oms', {
  order: {
    paymentStatus: {
      test_captured: {
        name: 'Captured',
        badge: 'success',
        isDefault: false,
        isRefundable: true
      },
      test_authorized: {
        name: 'Authorized',
        badge: 'warning',
        isDefault: false,
        isCapturable: true
      },
      test_settled: {
        name: 'Settled',
        badge: 'default',
        isDefault: false
      }
    }
  }
});

// Registered once for the file (jest isolates the registry per test file).
registerPaymentMethod({
  init: () => ({ code: 'refundable_method', name: 'Refundable' }),
  validator: () => true,
  refund: async () => ({ transactionId: 'r', amount: 1 })
});
registerPaymentMethod({
  init: () => ({ code: 'capturable_method', name: 'Capturable' }),
  validator: () => true,
  capture: async () => ({ transactionId: 'c', amount: 1 })
});
registerPaymentMethod({
  init: () => ({ code: 'bare_method', name: 'Bare' }),
  validator: () => true
});

const { canRefund, canCapture } = resolvers.Order;

describe('Order.canRefund (capability ∧ state)', () => {
  it('true when the method supports refund AND the status is refundable', async () => {
    expect(
      await canRefund({
        paymentMethod: 'refundable_method',
        paymentStatus: 'test_captured'
      })
    ).toBe(true);
  });

  it('false when the status is not refundable, even with a refund handler', async () => {
    expect(
      await canRefund({
        paymentMethod: 'refundable_method',
        paymentStatus: 'test_settled'
      })
    ).toBe(false);
  });

  it('false when the status is refundable but the method has no refund handler', async () => {
    expect(
      await canRefund({
        paymentMethod: 'bare_method',
        paymentStatus: 'test_captured'
      })
    ).toBe(false);
  });

  it('false for an unknown or missing payment method', async () => {
    expect(
      await canRefund({
        paymentMethod: 'not_registered',
        paymentStatus: 'test_captured'
      })
    ).toBe(false);
    expect(
      await canRefund({ paymentMethod: null, paymentStatus: 'test_captured' })
    ).toBe(false);
  });
});

describe('Order.canCapture (capability ∧ state)', () => {
  it('true when the method supports capture AND the status is capturable', async () => {
    expect(
      await canCapture({
        paymentMethod: 'capturable_method',
        paymentStatus: 'test_authorized'
      })
    ).toBe(true);
  });

  it('false when the status is not capturable (e.g. already captured)', async () => {
    expect(
      await canCapture({
        paymentMethod: 'capturable_method',
        paymentStatus: 'test_captured'
      })
    ).toBe(false);
  });

  it('false when the method has no capture handler', async () => {
    expect(
      await canCapture({
        paymentMethod: 'refundable_method',
        paymentStatus: 'test_authorized'
      })
    ).toBe(false);
  });

  it('false for a missing payment method', async () => {
    expect(
      await canCapture({ paymentMethod: null, paymentStatus: 'test_authorized' })
    ).toBe(false);
  });
});
