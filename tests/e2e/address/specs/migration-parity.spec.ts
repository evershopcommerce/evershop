import { test, expect } from '@playwright/test';
import { getDb } from '../../shared/db.js';
import {
  getColumns,
  getConstraintColumns,
  getSharedAddressColumnSignature,
  isAddressSchemaMigrated,
  OLD_ADDRESS_COLUMNS,
  SHARED_ADDRESS_COLUMNS,
  tableExists
} from '../../shared/addressDb.js';

/**
 * Address Format Registry — outcome of the rename migrations (spec § 5.1, § 8).
 *
 * Runs against a database that has booted the new release once. Skips itself
 * on an un-migrated database so the shared suite stays green either way.
 * Use a THROWAWAY copy of a real store database:
 *   DATABASE_URL=postgres://…/evershop_pr2 npx playwright test address
 */

test.describe('address schema after the rename migrations', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isAddressSchemaMigrated()),
      'database has not run checkout Version-1.0.12 yet'
    );
  });

  test('the three address tables carry the identical shared column set, with identical types', async () => {
    const customer = await getSharedAddressColumnSignature('customer_address');
    const cart = await getSharedAddressColumnSignature('cart_address');
    const order = await getSharedAddressColumnSignature('order_address');
    expect(customer).toHaveLength(SHARED_ADDRESS_COLUMNS.length);
    expect(cart).toEqual(customer);
    expect(order).toEqual(customer);
    expect(customer.find((c) => c.startsWith('extra:'))).toBe('extra:jsonb');
  });

  test('no old column name survives on any of the five tables', async () => {
    for (const table of ['customer_address', 'cart_address', 'order_address']) {
      const names = (await getColumns(table)).map((c) => c.column_name);
      for (const old of OLD_ADDRESS_COLUMNS) expect(names, `${table}.${old}`).not.toContain(old);
    }
    const tax = (await getColumns('tax_rate')).map((c) => c.column_name);
    expect(tax).toContain('administrative_area');
    expect(tax).toContain('postal_code');
    expect(tax).not.toContain('province');
    expect(tax).not.toContain('postcode');
  });

  test('shipping_zone_region replaced shipping_zone_province with the four-column unique constraint', async () => {
    expect(await tableExists('shipping_zone_region')).toBe(true);
    expect(await tableExists('shipping_zone_province')).toBe(false);
    const names = (await getColumns('shipping_zone_region')).map((c) => c.column_name);
    expect(names).toEqual(
      expect.arrayContaining(['shipping_zone_region_id', 'uuid', 'zone_id', 'country', 'level', 'region_key'])
    );
    expect(names).not.toContain('province');
    expect(await getConstraintColumns('SHIPPING_ZONE_REGION_ZONE_COUNTRY_LEVEL_KEY_UNIQUE')).toEqual([
      'zone_id',
      'country',
      'level',
      'region_key'
    ]);
    expect(await getConstraintColumns('SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE')).toEqual([]);
    expect(await getConstraintColumns('SHIPPING_ZONE_REGION_UUID_UNIQUE')).toEqual(['uuid']);
    expect(await getConstraintColumns('FK_SHIPPING_ZONE_REGION')).toEqual(['zone_id']);
    expect(await getConstraintColumns('shipping_zone_region_pkey')).toEqual(['shipping_zone_region_id']);

    const db = getDb();
    const { rows } = await db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM "shipping_zone_region" WHERE "level" <> 'administrative_area'`
    );
    expect(rows[0].n).toBe('0');
  });

  test('the migration table records the new versions', async () => {
    const db = getDb();
    const { rows } = await db.query<{ module: string; version: string }>(
      `SELECT "module", "version" FROM "migration" WHERE "module" IN ('checkout', 'customer', 'tax')`
    );
    const byModule = Object.fromEntries(rows.map((r) => [r.module, r.version]));
    expect(byModule.checkout).toBe('1.0.12');
    expect(byModule.customer).toBe('1.0.5');
    expect(byModule.tax).toBe('1.0.1');
  });

  test('replaying the three migration files on the migrated schema is a no-op', async () => {
    const before = {
      customer: await getColumns('customer_address'),
      cart: await getColumns('cart_address'),
      order: await getColumns('order_address'),
      zone: await getColumns('shipping_zone_region'),
      tax: await getColumns('tax_rate')
    };
    const root = new URL('../../../../packages/evershop/dist/', import.meta.url);
    const checkout = (await import(new URL('modules/checkout/migration/Version-1.0.12.js', root).href)).default;
    const customer = (await import(new URL('modules/customer/migration/Version-1.0.5.js', root).href)).default;
    const tax = (await import(new URL('modules/tax/migration/Version-1.0.1.js', root).href)).default;

    const client = await getDb().connect();
    try {
      await client.query('BEGIN');
      await checkout(client);
      await customer(client);
      await tax(client);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    expect(await getColumns('customer_address')).toEqual(before.customer);
    expect(await getColumns('cart_address')).toEqual(before.cart);
    expect(await getColumns('order_address')).toEqual(before.order);
    expect(await getColumns('shipping_zone_region')).toEqual(before.zone);
    expect(await getColumns('tax_rate')).toEqual(before.tax);
  });
});
