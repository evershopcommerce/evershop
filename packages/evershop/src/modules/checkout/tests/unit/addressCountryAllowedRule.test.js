process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import '../basicSetup.js';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
  configureAddressRuntime,
  resetAddressRuntime
} from '../../../../lib/address/runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../../../lib/address/settings.js';
import { validateBeforeCreateOrder } from '../../services/orderValidator.js';

const COUNTRY_ERROR = 'We do not sell to the address country';

// Stub cart (as in billingAddressRule.test.js): a real Cart would resolve the
// address rows from the database, which the test env has no DB for.
function stubCart(overrides = {}) {
  const data = {
    grand_total: 100,
    billing_address_id: 12,
    shipping_address_id: 5,
    no_shipping_required: false,
    shipping_method_data: { method_code: 'standard' },
    shipping_address: { country: 'US' },
    billing_address: { country: 'US' },
    customer_id: 1,
    ...overrides
  };
  return {
    hasError: () => false,
    getItems: () => [{}],
    getData: (key) => data[key]
  };
}

const sellTo = (list) =>
  configureAddressRuntime({
    getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, sellToCountries: list })
  });

describe('addressCountryAllowed order validation rule (spec § 3.13, D-12)', () => {
  afterEach(() => resetAddressRuntime());

  it('passes with the default `all`', async () => {
    const result = await validateBeforeCreateOrder(stubCart({ shipping_address: { country: 'DE' } }));
    expect(result.errors).not.toContain(COUNTRY_ERROR);
  });

  it('fails when the shipping address country is outside the sell-to list', async () => {
    sellTo(['US']);
    const result = await validateBeforeCreateOrder(stubCart({ shipping_address: { country: 'DE' } }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(COUNTRY_ERROR);
  });

  it('fails when the billing address country is outside the list', async () => {
    sellTo(['US']);
    const result = await validateBeforeCreateOrder(stubCart({ billing_address: { country: 'CN' } }));
    expect(result.errors).toContain(COUNTRY_ERROR);
  });

  it('ignores the shipping address when no shipping is required, and passes listed countries', async () => {
    sellTo(['US']);
    const skipped = await validateBeforeCreateOrder(
      stubCart({ no_shipping_required: true, shipping_address: { country: 'DE' } })
    );
    expect(skipped.errors).not.toContain(COUNTRY_ERROR);
    const listed = await validateBeforeCreateOrder(stubCart());
    expect(listed.errors).not.toContain(COUNTRY_ERROR);
  });

  it('only re-checks the country: an incomplete legacy cart address still places', async () => {
    sellTo(['US']);
    const result = await validateBeforeCreateOrder(
      stubCart({ shipping_address: { country: 'US', telephone: null, locality: null } })
    );
    expect(result.errors).not.toContain(COUNTRY_ERROR);
  });
});
