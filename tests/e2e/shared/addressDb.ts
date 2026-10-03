import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';

/**
 * Fixture world for the address-schema specs (Address Format Registry, PR2).
 *
 * These specs assert the OUTCOME of the rename migrations on a database that
 * has already run them (checkout 1.0.12, customer 1.0.5, tax 1.0.1):
 * identical column sets on the three address tables, the new zone
 * constraint, replay safety, and the legacy-order rendering invariant.
 *
 * Run them against a THROWAWAY copy of a real database, never the shared dev
 * DB blindly: `DATABASE_URL=postgres://…/evershop_pr2 npx playwright test address`.
 * `isAddressSchemaMigrated()` lets every spec skip itself on an un-migrated
 * database so the rest of the suite is unaffected.
 *
 * Convention (mirrors shippingDb.ts): every inserted row carries the
 * `E2E-ADDR` marker in `recipient`, so `cleanupAddressWorld()` can sweep an
 * interrupted run idempotently.
 */

export const ADDRESS_TAG = 'E2E-ADDR';

/** The address columns the three tables must share after the migration (spec § 3.1). */
export const SHARED_ADDRESS_COLUMNS = [
  'recipient',
  'given_name',
  'family_name',
  'organization',
  'address_line_1',
  'address_line_2',
  'address_line_3',
  'dependent_locality',
  'locality',
  'administrative_area',
  'postal_code',
  'sorting_code',
  'country',
  'telephone',
  'extra'
] as const;

export const OLD_ADDRESS_COLUMNS = [
  'full_name',
  'address_1',
  'address_2',
  'city',
  'province',
  'postcode'
] as const;

export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export async function getColumns(table: string): Promise<ColumnInfo[]> {
  const db = getDb();
  const { rows } = await db.query<ColumnInfo>(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1
      ORDER BY column_name`,
    [table]
  );
  return rows;
}

/** The shared address columns of a table as `name:type`, sorted — comparable across tables. */
export async function getSharedAddressColumnSignature(table: string): Promise<string[]> {
  const columns = await getColumns(table);
  return columns
    .filter((c) => (SHARED_ADDRESS_COLUMNS as readonly string[]).includes(c.column_name))
    .map((c) => `${c.column_name}:${c.data_type}`)
    .sort();
}

export async function getConstraintColumns(constraintName: string): Promise<string[]> {
  const db = getDb();
  const { rows } = await db.query<{ column_name: string }>(
    `SELECT a.attname AS column_name
       FROM pg_constraint c
       JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.conname = $1
      ORDER BY k.ord`,
    [constraintName]
  );
  return rows.map((r) => r.column_name);
}

export async function tableExists(table: string): Promise<boolean> {
  const db = getDb();
  const { rows } = await db.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [table]
  );
  return rows[0]?.exists === true;
}

/** True once checkout 1.0.12 has run: `order_address.recipient` exists and `order_address.full_name` does not. */
export async function isAddressSchemaMigrated(): Promise<boolean> {
  const columns = (await getColumns('order_address')).map((c) => c.column_name);
  return columns.includes('recipient') && !columns.includes('full_name');
}

export interface LegacyFixtureEntry {
  label: string;
  row: Record<string, string | number | null>;
  expected: Record<string, string[]>;
}

/** The recorded pre-migration rows (old column names) with their expected display lines. */
export function loadLegacyFixture(): LegacyFixtureEntry[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(
    here,
    '../../../packages/evershop/src/lib/address/tests/unit/fixtures/legacyOrderAddressRows.json'
  );
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { rows: LegacyFixtureEntry[] }).rows;
}

const LEGACY_TO_NEW: Record<string, string> = {
  full_name: 'recipient',
  address_1: 'address_line_1',
  address_2: 'address_line_2',
  city: 'locality',
  province: 'administrative_area',
  postcode: 'postal_code',
  country: 'country',
  telephone: 'telephone'
};

/**
 * Insert the fixture rows into the MIGRATED `order_address` (new column names,
 * values exactly as recorded), tagged for cleanup. Returns the inserted ids by
 * fixture label.
 */
export async function seedLegacyOrderAddresses(): Promise<Record<string, number>> {
  const db = getDb();
  const ids: Record<string, number> = {};
  for (const entry of loadLegacyFixture()) {
    const values: Record<string, string | null> = {};
    for (const [oldName, newName] of Object.entries(LEGACY_TO_NEW)) {
      if (oldName in entry.row) values[newName] = entry.row[oldName] as string | null;
    }
    values.recipient = `${ADDRESS_TAG} ${values.recipient ?? ''}`.trim();
    const columns = Object.keys(values);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    const { rows } = await db.query<{ order_address_id: number }>(
      `INSERT INTO "order_address" (${columns.map((c) => `"${c}"`).join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING order_address_id`,
      columns.map((c) => values[c])
    );
    ids[entry.label] = rows[0].order_address_id;
  }
  return ids;
}

export async function cleanupAddressWorld(): Promise<void> {
  const db = getDb();
  if (await isAddressSchemaMigrated()) {
    await db.query(`DELETE FROM "order_address" WHERE "recipient" LIKE $1`, [`${ADDRESS_TAG}%`]);
  } else if (await tableExists('order_address')) {
    await db.query(`DELETE FROM "order_address" WHERE "full_name" LIKE $1`, [`${ADDRESS_TAG}%`]);
  }
}
