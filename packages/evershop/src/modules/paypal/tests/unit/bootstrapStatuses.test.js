process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import bootstrap from '../../bootstrap.js';

/**
 * Guard for the status registry gap: the Version-1.0.0 migration maps legacy
 * statuses onto paypal_failed / paypal_refunded / paypal_partial_refunded,
 * and PR 3 (refunds, webhook) sets them at runtime — so bootstrap must
 * register all five, not just authorized/captured. Also pins the
 * cancelability contract: captured money can't be canceled (it must be
 * refunded), which keeps cancelOrder from failing halfway through the
 * void-authorization hook.
 */
describe('paypal bootstrap payment statuses', () => {
  beforeAll(async () => {
    await bootstrap();
  });

  it('registers the full status set', () => {
    const statuses = config.get('oms.order.paymentStatus');
    [
      'paypal_authorized',
      'paypal_captured',
      'paypal_pending',
      'paypal_failed',
      'paypal_refunded',
      'paypal_partial_refunded'
    ].forEach((code) => {
      expect(statuses[code]).toBeDefined();
      expect(statuses[code].name).toEqual(expect.any(String));
      expect(statuses[code].badge).toEqual(expect.any(String));
    });
  });

  it('blocks canceling settled money, allows canceling an authorization', () => {
    const statuses = config.get('oms.order.paymentStatus');
    expect(statuses.paypal_authorized.isCancelable).toBe(true);
    expect(statuses.paypal_captured.isCancelable).toBe(false);
    expect(statuses.paypal_pending.isCancelable).toBe(false);
    expect(statuses.paypal_refunded.isCancelable).toBe(false);
    expect(statuses.paypal_partial_refunded.isCancelable).toBe(false);
  });

  it('maps every status into the PSO table', () => {
    const pso = config.get('oms.order.psoMapping');
    expect(pso['paypal_authorized:*']).toBe('processing');
    expect(pso['paypal_captured:*']).toBe('processing');
    expect(pso['paypal_captured:delivered']).toBe('completed');
    expect(pso['paypal_pending:*']).toBe('processing');
    expect(pso['paypal_failed:*']).toBe('new');
    expect(pso['paypal_refunded:*']).toBe('closed');
    expect(pso['paypal_partial_refunded:*']).toBe('processing');
    expect(pso['paypal_partial_refunded:delivered']).toBe('completed');
  });
});
