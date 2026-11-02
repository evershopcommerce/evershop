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
const { isPaymentMethodEnabled } = await import(
  '../../services/paymentMethods.js'
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
    const moved = [
      resolveCapturedStatus('venmo', undefined, venmo.statuses),
      resolveRefundStatus('venmo', 10, 10, 'USD', venmo.statuses).status,
      resolveRefundStatus('venmo', 10, 4, 'USD', venmo.statuses).status
    ];
    expect(moved).toEqual([
      'paypal_captured',
      'paypal_refunded',
      'paypal_partial_refunded'
    ]);
    moved.forEach((code) => expect(registered[code]).toBeDefined());
    expect(paypal.statuses).toEqual(venmo.statuses);
  });

  it('reads the enable flag of the admin (1/0) and of config (true/false)', () => {
    expect([true, 1, '1'].map(isPaymentMethodEnabled)).toEqual([
      true,
      true,
      true
    ]);
    expect(
      [false, 0, '0', undefined, null, ''].map(isPaymentMethodEnabled)
    ).toEqual([false, false, false, false, false, false]);
  });

  // Last: config defaults cannot be removed again within this file
  it('lets system.paypal.venmoStatus turn Venmo off over the admin setting', async () => {
    settingValues.paypalVenmoStatus = '1';
    config.util.setModuleDefaults('system', { paypal: { venmoStatus: false } });
    expect(await venmo.validator()).toBe(false);
  });
});
