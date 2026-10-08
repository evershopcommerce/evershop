import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { PoolClient } from 'pg';
import { getDb } from '../../shared/db.js';
import { isAddressSchemaMigrated, loadLegacyFixture } from '../../shared/addressDb.js';

/**
 * The upgrade path a REAL store takes (spec § 5.1, § 5.3), on populated
 * tables — which a fresh install cannot exercise. Everything runs inside one
 * transaction that is rolled back at the end, so the database is left exactly
 * as found:
 *   1. run scripts/address-formats/rollback-schema.sql → pre-1.0.12 schema
 *      (this is also the only test that script has);
 *   2. insert rows in the OLD column names: customer, cart and order
 *      addresses, zone provinces (two overlapping zones), a tax rate;
 *   3. replay the three migrations in module order (checkout → customer → tax);
 *   4. assert: catalog identical to the live one; every value under its new
 *      column, byte for byte; the added columns NULL (no backfill); zone keys
 *      preserved with `level` defaulted; the four-column unique constraint;
 *      idempotent replay; the recorded legacy display lines.
 * ALTER TABLE takes ACCESS EXCLUSIVE locks for a few hundred milliseconds;
 * `lock_timeout` keeps the spec from ever hanging on a busy server.
 */

const TABLES = ['customer_address', 'cart_address', 'order_address', 'shipping_zone_region', 'tax_rate'];
const LEGACY_COLS = ['uuid', 'full_name', 'telephone', 'address_1', 'address_2', 'postcode', 'city', 'province', 'country'];
const NEW_OF: Record<string, string> = {
  full_name: 'recipient',
  address_1: 'address_line_1',
  address_2: 'address_line_2',
  postcode: 'postal_code',
  city: 'locality',
  province: 'administrative_area',
  country: 'country',
  telephone: 'telephone'
};
const DIST = new URL('../../../../packages/evershop/dist/', import.meta.url);
const ROLLBACK_SQL = fileURLToPath(new URL('../../../../scripts/address-formats/rollback-schema.sql', import.meta.url));
const MIGRATIONS = [
  'modules/checkout/migration/Version-1.0.12.js',
  'modules/customer/migration/Version-1.0.5.js',
  'modules/tax/migration/Version-1.0.1.js'
];

async function snapshot(client: PoolClient) {
  const cols = await client.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default, is_identity
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ANY($1)
      ORDER BY 1, 2`,
    [TABLES]
  );
  const cons = await client.query(
    `SELECT r.relname AS t, c.conname, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
      WHERE r.relname = ANY($1) ORDER BY 1, 2`,
    [TABLES]
  );
  const idx = await client.query(
    `SELECT tablename, indexname FROM pg_indexes WHERE tablename = ANY($1) ORDER BY 1, 2`,
    [TABLES]
  );
  return { cols: cols.rows, cons: cons.rows, idx: idx.rows };
}

async function columnsOf(client: PoolClient, table: string): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1 ORDER BY 1`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

async function insertLegacy(
  client: PoolClient,
  table: string,
  fixture: ReturnType<typeof loadLegacyFixture>,
  extra: Record<string, unknown> = {}
) {
  for (const { row } of fixture) {
    const values: Record<string, unknown> = { ...Object.fromEntries(LEGACY_COLS.map((c) => [c, row[c]])), ...extra };
    const cols = Object.keys(values);
    await client.query(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
      cols.map((c) => values[c])
    );
  }
}

async function runMigrations(client: PoolClient) {
  for (const file of MIGRATIONS) {
    const migration = (await import(new URL(file, DIST).href)).default;
    await migration(client);
  }
}

test.describe('upgrade from the pre-1.0.12 schema on populated tables', () => {
  test.beforeAll(async () => {
    test.skip(!(await isAddressSchemaMigrated()), 'database has not run checkout Version-1.0.12 yet');
  });

  test('rollback → legacy rows → upgrade reproduces the live catalog and keeps every value', async () => {
    test.setTimeout(60_000);
    const fixture = loadLegacyFixture();
    const client = await getDb().connect();
    let zone1 = 0;
    let zone2 = 0;
    let taxSeeded = false;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL lock_timeout = '5s'`);
      const live = await snapshot(client);

      await test.step('operator rollback restores the pre-1.0.12 schema', async () => {
        await client.query(fs.readFileSync(ROLLBACK_SQL, 'utf8'));
        const order = await columnsOf(client, 'order_address');
        for (const c of ['full_name', 'address_1', 'address_2', 'city', 'province', 'postcode']) expect(order).toContain(c);
        for (const c of ['recipient', 'organization', 'given_name', 'extra']) expect(order).not.toContain(c);
        const zone = await columnsOf(client, 'shipping_zone_province');
        expect(zone).toContain('province');
        expect(zone).toContain('shipping_zone_province_id');
        expect(zone).not.toContain('level');
        const { rows } = await client.query<{ conname: string }>(
          `SELECT conname FROM pg_constraint WHERE conrelid = 'shipping_zone_province'::regclass`
        );
        expect(rows.map((r) => r.conname).sort()).toEqual(
          [
            'FK_SHIPPING_ZONE_PROVINCE',
            'SHIPPING_ZONE_PROVINCE_UUID_UNIQUE',
            'SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE',
            'shipping_zone_province_pkey'
          ].sort()
        );
        const tax = await columnsOf(client, 'tax_rate');
        expect(tax).toContain('province');
        expect(tax).toContain('postcode');
        const mig = await client.query<{ module: string; version: string }>(
          `SELECT module, version FROM migration WHERE module IN ('checkout', 'customer', 'tax')`
        );
        expect(Object.fromEntries(mig.rows.map((r) => [r.module, r.version]))).toEqual({
          checkout: '1.0.11',
          customer: '1.0.4',
          tax: '1.0.0'
        });
      });

      await test.step('seed rows in the old column names', async () => {
        await insertLegacy(client, 'order_address', fixture);
        await insertLegacy(client, 'cart_address', fixture);
        const customer = await client.query<{ customer_id: number }>(
          `INSERT INTO customer (email, password, full_name)
           VALUES ('e2e-addr-upgrade@example.com', 'x', 'E2E-ADDR Upgrade') RETURNING customer_id`
        );
        await insertLegacy(client, 'customer_address', fixture, { customer_id: customer.rows[0].customer_id });
        const zones = await client.query<{ shipping_zone_id: number }>(
          `INSERT INTO shipping_zone (name) VALUES ('E2E-ADDR VN'), ('E2E-ADDR VN overlap') RETURNING shipping_zone_id`
        );
        [zone1, zone2] = zones.rows.map((r) => r.shipping_zone_id);
        await client.query(
          `INSERT INTO shipping_zone_province (zone_id, country, province)
           VALUES ($1, 'VN', 'VN-SG'), ($1, 'VN', 'VN-57'), ($2, 'VN', 'VN-SG')`,
          [zone1, zone2]
        );
        const tax = await client.query<{ tax_class_id: number | null; priority: number }>(
          `SELECT (SELECT tax_class_id FROM tax_class ORDER BY 1 LIMIT 1) AS tax_class_id,
                  COALESCE(MAX(priority), 0) + 1 AS priority
             FROM tax_rate`
        );
        if (tax.rows[0].tax_class_id !== null) {
          await client.query(
            `INSERT INTO tax_rate (name, tax_class_id, country, province, postcode, rate, is_compound, priority)
             VALUES ('E2E-ADDR', $1, 'US', 'US-CA,US-NV', '94043', 8.25, false, $2)`,
            [tax.rows[0].tax_class_id, tax.rows[0].priority]
          );
          taxSeeded = true;
        }
      });

      await test.step('the upgrade runs in module order', async () => {
        await runMigrations(client);
      });

      await test.step('the catalog is identical to the live schema', async () => {
        expect(await snapshot(client)).toEqual(live);
      });

      await test.step('every legacy value sits under its new column, unchanged; added columns are NULL', async () => {
        for (const table of ['order_address', 'cart_address', 'customer_address']) {
          for (const { row, label } of fixture) {
            const { rows } = await client.query(
              `SELECT ${Object.values(NEW_OF).map((c) => `"${c}"`).join(', ')} FROM "${table}" WHERE uuid = $1`,
              [row.uuid]
            );
            const want = Object.fromEntries(Object.entries(NEW_OF).map(([o, n]) => [n, row[o] ?? null]));
            expect(rows[0], `${table}: ${label}`).toEqual(want);
          }
        }
        const { rows } = await client.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM order_address
            WHERE organization IS NOT NULL OR address_line_3 IS NOT NULL OR dependent_locality IS NOT NULL
               OR sorting_code IS NOT NULL OR given_name IS NOT NULL OR family_name IS NOT NULL OR extra IS NOT NULL`
        );
        expect(rows[0].n).toBe(0);
        if (taxSeeded) {
          const tax = await client.query(
            `SELECT administrative_area, postal_code FROM tax_rate WHERE name = 'E2E-ADDR'`
          );
          expect(tax.rows[0]).toEqual({ administrative_area: 'US-CA,US-NV', postal_code: '94043' });
        }
      });

      await test.step('zone keys preserved with level defaulted; the four-column unique constraint behaves', async () => {
        const { rows } = await client.query(
          `SELECT zone_id, country, level, region_key FROM shipping_zone_region
            WHERE zone_id IN ($1, $2) ORDER BY zone_id, region_key`,
          [zone1, zone2]
        );
        expect(rows).toEqual([
          { zone_id: zone1, country: 'VN', level: 'administrative_area', region_key: 'VN-57' },
          { zone_id: zone1, country: 'VN', level: 'administrative_area', region_key: 'VN-SG' },
          { zone_id: zone2, country: 'VN', level: 'administrative_area', region_key: 'VN-SG' }
        ]);
        await client.query('SAVEPOINT dup');
        await expect(
          client.query(
            `INSERT INTO shipping_zone_region (zone_id, country, level, region_key)
             VALUES ($1, 'VN', 'administrative_area', 'VN-SG')`,
            [zone1]
          )
        ).rejects.toMatchObject({ code: '23505' });
        await client.query('ROLLBACK TO SAVEPOINT dup');
        await client.query(
          `INSERT INTO shipping_zone_region (zone_id, country, level, region_key) VALUES ($1, 'VN', 'locality', 'VN-SG')`,
          [zone1]
        );
      });

      await test.step('replaying the migrations is a no-op', async () => {
        const before = await snapshot(client);
        await runMigrations(client);
        expect(await snapshot(client)).toEqual(before);
      });

      await test.step('legacy rows render the recorded lines', async () => {
        const { formatAddressRow } = await import(new URL('lib/address/index.js', DIST).href);
        for (const { row, expected, label } of fixture) {
          const { rows } = await client.query(`SELECT * FROM order_address WHERE uuid = $1`, [row.uuid]);
          for (const [locale, lines] of Object.entries(expected)) {
            expect(await formatAddressRow(rows[0], locale), `${label} [${locale}]`).toEqual(lines);
          }
        }
      });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
