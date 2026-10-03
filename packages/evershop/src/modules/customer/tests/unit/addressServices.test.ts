import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createFakeDb, createFakeQueryBuilder } from './fakeQueryBuilder.js';

/**
 * Customer address services on the Address Format Registry (spec § 3.8):
 * seam → validateAddress → extras folded → given(). No database: the query
 * builder and the connection module are replaced by the in-memory fake.
 */

const SEED_ADDRESS = {
  customer_address_id: 1,
  uuid: 'addr-1',
  customer_id: 7,
  recipient: 'Jane Smith',
  given_name: null,
  family_name: null,
  organization: null,
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
  extra: { tax_id: 'A', note: 'keep me' },
  is_default: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01')
};
const WITH_PARTS = {
  ...SEED_ADDRESS,
  customer_address_id: 2,
  uuid: 'addr-2',
  given_name: 'Jane',
  family_name: 'Smith',
  extra: null,
  is_default: false
};

const db = createFakeDb({
  customer: [{ customer_id: 7, uuid: 'cust-7', email: 'jane@example.com' }],
  customer_address: [SEED_ADDRESS, WITH_PARTS]
});
const qb = createFakeQueryBuilder(db);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));

const { default: createCustomerAddress } = await import(
  '../../services/customer/address/createCustomerAddress.js'
);
const { default: updateCustomerAddress } = await import(
  '../../services/customer/address/updateCustomerAddress.js'
);
const { normalizeAddressInput } = await import(
  '../../services/customer/address/normalizeAddressInput.js'
);
const { AddressValidationError } = await import(
  '../../services/customer/address/AddressValidationError.js'
);
const { addProcessor } = await import('../../../../lib/util/registry.js');
const { registerAddressField } = await import('../../../../lib/address/extras.js');
const { configureAddressRuntime, resetAddressRuntime } = await import(
  '../../../../lib/address/runtime.js'
);
const { ADDRESS_SETTINGS_DEFAULTS } = await import('../../../../lib/address/settings.js');

// What modules/customer/bootstrap.ts does at boot.
addProcessor('customerAddressDataBeforeCreate', normalizeAddressInput, 0);
addProcessor('customerAddressDataBeforeUpdate', normalizeAddressInput, 0);
registerAddressField({ id: 'tax_id', type: 'text', label: 'Tax ID', countries: ['US'] });
registerAddressField({ id: 'note', type: 'text', label: 'Delivery note' });

const VALID_US = {
  recipient: 'Jane Smith',
  telephone: '(650) 253-0000',
  address_line_1: '1600 Amphitheatre Pkwy',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'us',
  is_default: 1
};

const lastInsert = () => db.inserts[db.inserts.length - 1];
// The service also resets `is_default` on the customer's other rows whenever
// the stored row is the default; the assertions target the update of the row
// itself (`WHERE uuid = …`).
const rowUpdates = (uuid: string) =>
  db.updates.filter((u) =>
    u.where.some(([column, op, value]) => column === 'uuid' && op === '=' && value === uuid)
  );
const lastUpdate = (uuid = 'addr-1') => {
  const updates = rowUpdates(uuid);
  if (updates.length === 0) throw new Error(`no update recorded for ${uuid}`);
  return updates[updates.length - 1];
};

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e as InstanceType<typeof AddressValidationError>;
  }
  throw new Error('expected the service to reject');
}

describe('createCustomerAddress', () => {
  beforeEach(() => {
    db.inserts.length = 0;
    db.tx.rolledBack = 0;
  });

  it('normalizes, validates and inserts the row under the new column names', async () => {
    const result = await createCustomerAddress('cust-7', { ...VALID_US }, {});
    const { table, data } = lastInsert();
    expect(table).toBe('customer_address');
    expect(data).toMatchObject({
      recipient: 'Jane Smith',
      telephone: '+16502530000',
      administrative_area: 'US-CA',
      postal_code: '94043',
      country: 'US',
      customer_id: 7,
      is_default: 1,
      extra: null
    });
    expect(result.uuid).toMatch(/^uuid-/);
    expect(db.tx.committed).toBeGreaterThan(0);
  });

  it('rejects the old vocabulary with a field-targeted unknown_field error and rolls back', async () => {
    const e = await rejection(
      createCustomerAddress('cust-7', { ...VALID_US, province: 'CA' }, {})
    );
    expect(e).toBeInstanceOf(AddressValidationError);
    expect(e.errors).toContainEqual(
      expect.objectContaining({ field: 'province', code: 'unknown_field' })
    );
    expect(db.inserts).toHaveLength(0);
    expect(db.tx.rolledBack).toBe(1);
  });

  it('reports every schema-derived error at once (required telephone, invalid region)', async () => {
    const e = await rejection(
      createCustomerAddress(
        'cust-7',
        { ...VALID_US, telephone: '', administrative_area: 'US-ZZ' },
        {}
      )
    );
    const codes = e.errors.map((err) => `${err.field}:${err.code}`);
    expect(codes).toEqual(
      expect.arrayContaining(['telephone:required', 'administrative_area:region_invalid'])
    );
    expect(e.errors.every((err) => typeof err.message === 'string' && err.message)).toBe(true);
  });

  it('folds registered extras into `extra` instead of a column', async () => {
    await createCustomerAddress('cust-7', { ...VALID_US, tax_id: '1234567890' }, {});
    const { data } = lastInsert();
    expect(data.extra).toEqual({ tax_id: '1234567890' });
    expect(data).not.toHaveProperty('tax_id');
  });

  it('rejects an address outside the sell-to list with country_not_allowed', async () => {
    configureAddressRuntime({
      getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, sellToCountries: ['DE'] })
    });
    try {
      const e = await rejection(createCustomerAddress('cust-7', { ...VALID_US }, {}));
      expect(e.errors).toContainEqual(
        expect.objectContaining({ field: 'country', code: 'country_not_allowed' })
      );
    } finally {
      resetAddressRuntime();
    }
  });
});

describe('updateCustomerAddress', () => {
  beforeEach(() => {
    db.updates.length = 0;
    db.tables.customer_address = [SEED_ADDRESS, WITH_PARTS].map((r) => ({ ...r }));
  });
  afterEach(() => resetAddressRuntime());

  it('validates the merged row, updates only the payload columns and leaves `extra` alone', async () => {
    await updateCustomerAddress('addr-1', { telephone: '650 253 0001' }, {});
    expect(lastUpdate().data).toEqual({ telephone: '+16502530001' });
  });

  it('merges `extra` key by key: a value replaces, null deletes, absent keys are kept (D-11)', async () => {
    await updateCustomerAddress('addr-1', { tax_id: 'B' }, {});
    expect(lastUpdate().data.extra).toEqual({ tax_id: 'B', note: 'keep me' });
    await updateCustomerAddress('addr-1', { tax_id: null }, {});
    expect(lastUpdate().data.extra).toEqual({ note: 'keep me' });
  });

  it('rejects an unknown key on the payload even though the stored row is complete (D-10)', async () => {
    const e = await rejection(updateCustomerAddress('addr-1', { postcode: '94043' }, {}));
    expect(e.errors).toEqual([
      expect.objectContaining({ field: 'postcode', code: 'unknown_field' })
    ]);
    expect(db.updates).toHaveLength(0);
    expect(db.tx.rolledBack).toBeGreaterThan(0);
  });

  it('split mode: a legacy row without parts can change its telephone without re-entering the name', async () => {
    configureAddressRuntime({
      getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, nameFormat: 'split' })
    });
    await updateCustomerAddress('addr-1', { telephone: '650 253 0002' }, {});
    expect(lastUpdate().data).toEqual({ telephone: '+16502530002' });
  });

  it('split mode: touching one name part requires the other, and both recompose recipient', async () => {
    configureAddressRuntime({
      getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, nameFormat: 'split' })
    });
    const e = await rejection(updateCustomerAddress('addr-1', { given_name: 'Jane' }, {}));
    expect(e.errors).toContainEqual(
      expect.objectContaining({ field: 'family_name', code: 'required' })
    );
    await updateCustomerAddress('addr-1', { given_name: 'Jane', family_name: 'Doe' }, {});
    expect(lastUpdate().data).toMatchObject({
      given_name: 'Jane',
      family_name: 'Doe',
      recipient: 'Jane Doe'
    });
  });

  it('single mode: editing recipient clears the stored parts so they never disagree (§ 3.12 rule 6)', async () => {
    await updateCustomerAddress('addr-2', { recipient: 'Janet Smith' }, {});
    expect(lastUpdate('addr-2').data).toEqual({
      recipient: 'Janet Smith',
      given_name: null,
      family_name: null
    });
  });

  it('throws for an unknown address', async () => {
    await expect(updateCustomerAddress('missing', { telephone: '1' }, {})).rejects.toThrow(
      'Requested address not found'
    );
  });
});
