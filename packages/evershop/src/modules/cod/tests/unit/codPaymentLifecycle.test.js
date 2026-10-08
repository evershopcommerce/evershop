process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import config from 'config';

/**
 * COD is wired into the shared payment-operation contract: a placed COD order
 * sits in `cod_pending` (capturable — "capture" records the cash collected on
 * delivery), then `cod_captured` (refundable). This locks the regression where
 * the capture button vanished because COD registered neither a `capture` handler
 * nor a capturable status, so `Order.canCapture` was always false.
 *
 * We run the REAL cod bootstrap so the test exercises the actual statuses,
 * psoMapping, and handler registration — not a hand-copied fixture. COD's
 * `init()` reads a display-name SETTING from the DB; stub it so the bootstrap and
 * `getPaymentMethodFactory` (which matches methods by calling `init`) run without
 * a database.
 */
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (_name, def) => def
}));

const { default: codBootstrap } = await import('../../bootstrap.js');
const { default: omsResolvers } = await import(
  '../../../oms/graphql/types/Order/Order.admin.resolvers.js'
);
const { resolveOrderStatus } = await import(
  '../../../oms/services/updateOrderStatus.js'
);

const baseOms = {
  order: {
    paymentStatus: {
      pending: {
        name: 'Pending',
        badge: 'default',
        isDefault: true,
        isCancelable: true
      },
      paid: { name: 'Paid', badge: 'success', isRefundable: true }
    },
    shipmentStatus: {
      shipped: { name: 'Shipped', badge: 'warning' },
      delivered: { name: 'Delivered', badge: 'success' },
      canceled: { name: 'Canceled', badge: 'destructive' }
    },
    status: {
      new: { name: 'New', isDefault: true, next: ['processing', 'canceled'] },
      processing: { name: 'Processing', next: ['completed', 'canceled'] },
      completed: { name: 'Completed', next: ['closed'] },
      canceled: { name: 'Canceled', next: [] },
      closed: { name: 'Closed', next: [] }
    },
    psoMapping: { 'pending:pending': 'new', 'pending:*': 'processing' }
  }
};

beforeAll(async () => {
  config.util.setModuleDefaults('oms', baseOms);
  // Merges cod_* statuses + psoMapping into oms config and registers the cod
  // payment method (with capture + refund handlers).
  await codBootstrap();
});

const { canCapture, canRefund } = omsResolvers.Order;

describe('COD payment lifecycle wiring', () => {
  it('a freshly placed COD order (cod_pending) is capturable, not refundable', async () => {
    expect(
      await canCapture({ paymentMethod: 'cod', paymentStatus: 'cod_pending' })
    ).toBe(true);
    expect(
      await canRefund({ paymentMethod: 'cod', paymentStatus: 'cod_pending' })
    ).toBe(false);
  });

  it('a captured COD order (cod_captured) is refundable, not capturable', async () => {
    expect(
      await canCapture({ paymentMethod: 'cod', paymentStatus: 'cod_captured' })
    ).toBe(false);
    expect(
      await canRefund({ paymentMethod: 'cod', paymentStatus: 'cod_captured' })
    ).toBe(true);
  });

  it('a partially refunded COD order can still be refunded again', async () => {
    expect(
      await canRefund({
        paymentMethod: 'cod',
        paymentStatus: 'cod_partial_refunded'
      })
    ).toBe(true);
  });

  it('a fully refunded COD order is terminal — no more refunds', async () => {
    expect(
      await canRefund({ paymentMethod: 'cod', paymentStatus: 'cod_refunded' })
    ).toBe(false);
  });

  it('derives order status from the cod statuses', () => {
    expect(resolveOrderStatus('cod_pending', 'pending')).toBe('new');
    expect(resolveOrderStatus('cod_pending', 'shipped')).toBe('processing');
    expect(resolveOrderStatus('cod_captured', 'shipped')).toBe('processing');
    expect(resolveOrderStatus('cod_captured', 'delivered')).toBe('completed');
    expect(resolveOrderStatus('cod_refunded', 'delivered')).toBe('closed');
  });
});
