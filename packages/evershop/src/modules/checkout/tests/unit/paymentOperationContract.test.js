process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import {
  getPaymentMethodFactory,
  registerPaymentMethod
} from '../../services/getAvailablePaymentMethods.js';

/**
 * The payment operation contract's core claim: a method's SUPPORT for a
 * post-order money operation is the PRESENCE of that handler on its registered
 * factory — there are no `can_refund` / `can_capture` flags. `getPaymentMethodFactory`
 * is how core reaches those handlers. These tests lock down that resolution and
 * the presence-as-capability model against three differently-shaped methods.
 *
 * Registered once for the whole file (jest isolates the registry per test file).
 */

// Full gateway: capture + void + refund, partial refunds allowed.
registerPaymentMethod({
  init: () => ({ code: 'test_full', name: 'Full Gateway' }),
  validator: () => true,
  capture: async () => ({ transactionId: 'cap_1', amount: 10 }),
  void: async () => {},
  refund: async () => ({ transactionId: 'ref_1', amount: 10 }),
  supportsPartialRefund: true
});

// Offline method that only supports refund (COD-shaped): no auth to capture/void.
registerPaymentMethod({
  init: () => ({ code: 'test_refund_only', name: 'Refund Only' }),
  validator: () => true,
  refund: async () => ({ transactionId: 'ref_2', amount: 5, offline: true })
});

// Bare method: checkout only, no post-order operations at all.
registerPaymentMethod({
  init: () => ({ code: 'test_bare', name: 'Bare Method' }),
  validator: () => true
});

describe('getPaymentMethodFactory', () => {
  it('resolves the registered factory by its init() code', async () => {
    const factory = await getPaymentMethodFactory('test_full');
    expect(factory).toBeDefined();
    expect(typeof factory.capture).toBe('function');
    expect(typeof factory.void).toBe('function');
    expect(typeof factory.refund).toBe('function');
  });

  it('returns undefined for an unregistered code', async () => {
    expect(await getPaymentMethodFactory('does_not_exist')).toBeUndefined();
  });
});

describe('operation capability = handler presence', () => {
  it('a refund-only method exposes refund but neither capture nor void', async () => {
    const factory = await getPaymentMethodFactory('test_refund_only');
    expect(typeof factory.refund).toBe('function');
    expect(factory.capture).toBeUndefined();
    expect(factory.void).toBeUndefined();
  });

  it('a bare method exposes no operation handlers', async () => {
    const factory = await getPaymentMethodFactory('test_bare');
    expect(factory.refund).toBeUndefined();
    expect(factory.capture).toBeUndefined();
    expect(factory.void).toBeUndefined();
  });

  it('supportsPartialRefund is an explicit flag, not inferred from refund presence', async () => {
    const full = await getPaymentMethodFactory('test_full');
    const refundOnly = await getPaymentMethodFactory('test_refund_only');
    expect(full.supportsPartialRefund).toBe(true);
    // Registered a refund handler but set no flag → falsy (partial not supported).
    expect(refundOnly.supportsPartialRefund).toBeUndefined();
  });
});
