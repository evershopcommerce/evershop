import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

/**
 * Cart address services (spec § 3.8): seam → validateAddress with the surface
 * (sell-to check) → extras folded → cart_address insert → cart pointer update;
 * plus the saved-address reuse path (`customerAddressUuid`, § 3.1 "sync in
 * both directions"). No database.
 */

const SAVED = {
  customer_address_id: 1,
  uuid: 'saved-1',
  customer_id: 7,
  recipient: 'Jane Smith',
  given_name: null,
  family_name: null,
  organization: 'ACME',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: null,
  address_line_3: null,
  dependent_locality: null,
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  sorting_code: null,
  country: 'US',
  telephone: '+16502530000',
  extra: { nickname: 'Home' },
  is_default: true
};

const db = createFakeDb({
  cart: [
    { cart_id: 3, uuid: 'cart-3', status: true, customer_id: 7 },
    { cart_id: 4, uuid: 'cart-guest', status: true, customer_id: null }
  ],
  cart_address: [],
  customer_address: [SAVED, { ...SAVED, customer_address_id: 2, uuid: 'saved-other', customer_id: 8 }]
});
const qb = createFakeQueryBuilder(db);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));

const { addShippingAddress } = await import('../../services/addShippingAddress.js');
const { addBillingAddress } = await import('../../services/addBillingAddress.js');
const { normalizeAddressInput } = await import(
  '../../../customer/services/customer/address/normalizeAddressInput.js'
);
const { AddressValidationError } = await import(
  '../../../customer/services/customer/address/AddressValidationError.js'
);
const { addProcessor } = await import('../../../../lib/util/registry.js');
const { configureAddressRuntime, resetAddressRuntime } = await import(
  '../../../../lib/address/runtime.js'
);
const { ADDRESS_SETTINGS_DEFAULTS } = await import('../../../../lib/address/settings.js');

addProcessor('cartAddressDataBeforeSave', normalizeAddressInput, 0);

const VALID_DE = {
  recipient: 'Max Mustermann',
  telephone: '030 1234567',
  address_line_1: 'Unter den Linden 1',
  locality: 'Berlin',
  postal_code: '10117',
  country: 'DE'
};

const lastInsert = () => db.inserts[db.inserts.length - 1];
const lastUpdate = () => db.updates[db.updates.length - 1];

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e as InstanceType<typeof AddressValidationError>;
  }
  throw new Error('expected the service to reject');
}

describe('addShippingAddress / addBillingAddress', () => {
  beforeEach(() => {
    db.inserts.length = 0;
    db.updates.length = 0;
    db.tx.rolledBack = 0;
  });
  afterEach(() => resetAddressRuntime());

  it('saves a normalized shipping address and points the cart at it', async () => {
    const saved = await addShippingAddress('cart-3', { ...VALID_DE }, {});
    expect(lastInsert()).toMatchObject({
      table: 'cart_address',
      data: { telephone: '+49301234567', postal_code: '10117', country: 'DE', extra: null }
    });
    expect(lastUpdate()).toMatchObject({
      table: 'cart',
      data: { shipping_address_id: saved.cart_address_id }
    });
  });

  it('saves a billing address and points the cart at it', async () => {
    const saved = await addBillingAddress('cart-3', { ...VALID_DE }, {});
    expect(lastUpdate()).toMatchObject({
      table: 'cart',
      data: { billing_address_id: saved.cart_address_id }
    });
  });

  it('rejects a country outside the sell-to list on both surfaces with country_not_allowed', async () => {
    configureAddressRuntime({
      getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, sellToCountries: ['US'] })
    });
    for (const service of [addShippingAddress, addBillingAddress]) {
      const e = await rejection(service('cart-3', { ...VALID_DE }, {}));
      expect(e).toBeInstanceOf(AddressValidationError);
      expect(e.errors).toContainEqual(
        expect.objectContaining({ field: 'country', code: 'country_not_allowed' })
      );
    }
    expect(db.inserts).toHaveLength(0);
    expect(db.tx.rolledBack).toBe(2);
  });

  it('rejects the old vocabulary and missing required fields with field-targeted errors', async () => {
    const e = await rejection(
      addShippingAddress('cart-3', { ...VALID_DE, city: 'Berlin', telephone: undefined }, {})
    );
    const codes = e.errors.map((err) => `${err.field}:${err.code}`);
    expect(codes).toEqual(expect.arrayContaining(['city:unknown_field', 'telephone:required']));
  });

  describe('saved-address reuse: { customerAddressUuid }', () => {
    it('copies the customer’s saved row verbatim, extra included, after checking ownership', async () => {
      await addShippingAddress('cart-3', { customerAddressUuid: 'saved-1' }, {});
      expect(lastInsert().data).toMatchObject({
        recipient: 'Jane Smith',
        organization: 'ACME',
        administrative_area: 'US-CA',
        postal_code: '94043',
        country: 'US',
        telephone: '+16502530000',
        extra: { nickname: 'Home' }
      });
      expect(lastInsert().data).not.toHaveProperty('customerAddressUuid');
      expect(lastInsert().data).not.toHaveProperty('customer_address_id');
    });

    it('refuses another customer’s address and a guest cart', async () => {
      await expect(
        addBillingAddress('cart-3', { customerAddressUuid: 'saved-other' }, {})
      ).rejects.toThrow('Saved address not found');
      await expect(
        addShippingAddress('cart-guest', { customerAddressUuid: 'saved-1' }, {})
      ).rejects.toThrow('logged-in customer');
      expect(db.inserts).toHaveLength(0);
    });
  });
});
