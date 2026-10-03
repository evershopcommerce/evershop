import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Address Format Registry — rename `cart_address` and `order_address` to the
 * standard's vocabulary, add the universal postal columns, and rename the
 * shipping-zone region table. See wiki/address-format-registry.md and the
 * spec's § 3.1 / § 5.1.
 *
 * Metadata-only: `RENAME COLUMN` and a nullable `ADD COLUMN` without a default
 * rewrite no rows on PostgreSQL 13+, so `order_address` on a large store is
 * not touched. There is deliberately NO `UPDATE` statement in this file —
 * legacy orders keep every value they hold (spec § 5.3).
 *
 * Every statement is guarded, so the file is idempotent and a restart after a
 * partial run resumes cleanly. Modules migrate checkout → customer → tax, so
 * the three address tables match only after the whole boot has run.
 *
 * Deploy only together with the code that reads the new names (PR3); the old
 * code reads `full_name` and `province` and would fail on this schema.
 * Operator rollback: scripts/address-formats/rollback-schema.sql.
 */

const ADDRESS_RENAMES: Array<[from: string, to: string]> = [
  ['full_name', 'recipient'],
  ['address_1', 'address_line_1'],
  ['address_2', 'address_line_2'],
  ['city', 'locality'],
  ['province', 'administrative_area'],
  ['postcode', 'postal_code']
];

/** Rename only when the old column exists and the new one does not. */
async function renameColumn(
  connection: PoolClient,
  table: string,
  from: string,
  to: string
): Promise<void> {
  await execute(
    connection,
    `DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${from}')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${to}') THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', '${table}', '${from}', '${to}');
  END IF;
END $$;`
  );
}

async function renameConstraint(
  connection: PoolClient,
  table: string,
  from: string,
  to: string
): Promise<void> {
  await execute(
    connection,
    `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${from}')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${to}') THEN
    EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', '${table}', '${from}', '${to}');
  END IF;
END $$;`
  );
}

async function migrateAddressTable(
  connection: PoolClient,
  table: string
): Promise<void> {
  for (const [from, to] of ADDRESS_RENAMES) {
    await renameColumn(connection, table, from, to);
  }
  await execute(
    connection,
    `ALTER TABLE "${table}"
       ADD COLUMN IF NOT EXISTS "organization"       varchar,
       ADD COLUMN IF NOT EXISTS "address_line_3"     varchar,
       ADD COLUMN IF NOT EXISTS "dependent_locality" varchar,
       ADD COLUMN IF NOT EXISTS "sorting_code"       varchar,
       ADD COLUMN IF NOT EXISTS "given_name"         varchar,
       ADD COLUMN IF NOT EXISTS "family_name"        varchar,
       ADD COLUMN IF NOT EXISTS "extra"              jsonb`
  );
}

export default async (connection: PoolClient) => {
  await migrateAddressTable(connection, 'cart_address');
  await migrateAddressTable(connection, 'order_address');

  /* ────────────────────────────────────────────────────────────────────────
   * shipping_zone_province → shipping_zone_region. `country` already exists
   * (checkout 1.0.8). The unique constraint keeps `zone_id` because
   * overlapping zones are allowed (resolveZonesForAddress.ts); `level` is
   * constant on every existing row, so the new constraint cannot collide.
   * ──────────────────────────────────────────────────────────────────────── */
  await execute(
    connection,
    `DO $$
BEGIN
  IF to_regclass('shipping_zone_province') IS NOT NULL
     AND to_regclass('shipping_zone_region') IS NULL THEN
    ALTER TABLE "shipping_zone_province" RENAME TO "shipping_zone_region";
  END IF;
END $$;`
  );

  await renameColumn(
    connection,
    'shipping_zone_region',
    'shipping_zone_province_id',
    'shipping_zone_region_id'
  );
  await renameColumn(connection, 'shipping_zone_region', 'province', 'region_key');

  await execute(
    connection,
    `ALTER TABLE "shipping_zone_region"
       ADD COLUMN IF NOT EXISTS "level" varchar NOT NULL DEFAULT 'administrative_area'`
  );

  await execute(
    connection,
    `ALTER TABLE "shipping_zone_region"
       DROP CONSTRAINT IF EXISTS "SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE"`
  );
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_region"
       DROP CONSTRAINT IF EXISTS "SHIPPING_ZONE_REGION_ZONE_COUNTRY_LEVEL_KEY_UNIQUE"`
  );
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_region"
       ADD CONSTRAINT "SHIPPING_ZONE_REGION_ZONE_COUNTRY_LEVEL_KEY_UNIQUE"
       UNIQUE ("zone_id", "country", "level", "region_key")`
  );

  await renameConstraint(
    connection,
    'shipping_zone_region',
    'SHIPPING_ZONE_PROVINCE_UUID_UNIQUE',
    'SHIPPING_ZONE_REGION_UUID_UNIQUE'
  );
  await renameConstraint(
    connection,
    'shipping_zone_region',
    'FK_SHIPPING_ZONE_PROVINCE',
    'FK_SHIPPING_ZONE_REGION'
  );
  await renameConstraint(
    connection,
    'shipping_zone_region',
    'shipping_zone_province_pkey',
    'shipping_zone_region_pkey'
  );
  // The index of the same name lives in a different namespace from the constraint.
  await execute(
    connection,
    `ALTER INDEX IF EXISTS "FK_SHIPPING_ZONE_PROVINCE" RENAME TO "FK_SHIPPING_ZONE_REGION"`
  );
  // Cosmetic: the identity column's sequence keeps working under any name.
  await execute(
    connection,
    `ALTER SEQUENCE IF EXISTS "shipping_zone_province_shipping_zone_province_id_seq"
       RENAME TO "shipping_zone_region_shipping_zone_region_id_seq"`
  );
};
