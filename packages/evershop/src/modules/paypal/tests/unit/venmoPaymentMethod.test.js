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

const { default: bootstrap } = await import('../../bootstrap.js');
const { getPaymentMethodFactory } = await import(
  '../../../checkout/services/getAvailablePaymentMethods.js'
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
});
