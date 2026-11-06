import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals';

process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const settingValues = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getStoreCurrency: () => settingValues.storeCurrency ?? 'USD'
}));

const { default: config } = await import('config');
const { default: bootstrap } = await import('../../bootstrap.js');
const { getPaymentMethodFactory } = await import(
  '../../../checkout/services/getAvailablePaymentMethods.js'
);
const { resolveCapturedStatus, resolveRefundStatus } = await import(
  '../../../oms/services/refundStatus.js'
);

/**
 * Venmo is a PayPal funding source, not a separate gateway: it must reach
 * checkout only when the admin enables it AND the store sells in USD, and it
 * must share PayPal's capture/void/refund handlers so core money operations
 * work on Venmo orders exactly as on PayPal ones.
 */
describe('venmo payment method', () => {
  let paypal;
  let venmo;

  beforeAll(async () => {
    await bootstrap();
    paypal = await getPaymentMethodFactory('paypal');
    venmo = await getPaymentMethodFactory('venmo');
  });

  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('is registered with its own display name', async () => {
    expect(venmo).toBeDefined();
    expect(await venmo.init()).toEqual({ code: 'venmo', name: 'Venmo' });
    settingValues.paypalVenmoDisplayName = 'Pay with Venmo';
    expect((await venmo.init()).name).toBe('Pay with Venmo');
  });

  it('is disabled by default', async () => {
    expect(await venmo.validator()).toBe(false);
  });

  it('is available once enabled in a USD store', async () => {
    settingValues.paypalVenmoStatus = '1';
    expect(await venmo.validator()).toBe(true);
  });

  it('is hidden when the store currency is not USD', async () => {
    settingValues.paypalVenmoStatus = '1';
    settingValues.storeCurrency = 'EUR';
    expect(await venmo.validator()).toBe(false);
  });

  it('does not depend on the PayPal method being enabled', async () => {
    settingValues.paypalPaymentStatus = '0';
    settingValues.paypalVenmoStatus = '1';
    expect(await paypal.validator()).toBe(false);
    expect(await venmo.validator()).toBe(true);
  });

  it('shares the PayPal money handlers', () => {
    expect(venmo.capture).toBe(paypal.capture);
    expect(venmo.void).toBe(paypal.void);
    expect(venmo.refund).toBe(paypal.refund);
  });

  // Core picks the status of a recorded capture/refund from the method's
  // `statuses`, else `<method>_<state>`. Without the declaration an admin
  // capture of a Venmo order moved it to the unregistered `venmo_captured`
  // AFTER PayPal had taken the money, and the local record rolled back.
  it('moves Venmo orders onto the registered paypal_* statuses', () => {
    const registered = config.get('oms.order.paymentStatus');
    for (const factory of [paypal, venmo]) {
      const captured = resolveCapturedStatus(
        'venmo',
        undefined,
        factory.statuses
      );
      const refunded = resolveRefundStatus(
        'venmo',
        10,
        10,
        'USD',
        factory.statuses
      ).status;
      const partial = resolveRefundStatus(
        'venmo',
        10,
        4,
        'USD',
        factory.statuses
      ).status;
      expect([captured, refunded, partial]).toEqual([
        'paypal_captured',
        'paypal_refunded',
        'paypal_partial_refunded'
      ]);
      for (const code of [captured, refunded, partial]) {
        expect(registered[code]).toBeDefined();
      }
    }
  });
});
