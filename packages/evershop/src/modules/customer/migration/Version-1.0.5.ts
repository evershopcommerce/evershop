import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Address Format Registry — rename `customer_address` to the standard's
 * vocabulary and add the universal postal columns. The cart and order tables
 * get the identical change in checkout `Version-1.0.12.ts`; the three tables
 * must stay column-for-column identical because `orderCreator` copies a cart
 * address into `order_address` without naming columns (spec § 3.1).
 *
 * Metadata-only (no row rewrite), guarded (idempotent, replay-safe), and
 * deliberately without any `UPDATE`. `country` stays `NOT NULL` here (spec
 * D10: nullability differences between the three tables are recorded, not
 * fixed). Deploy only together with PR3; see wiki/address-format-registry.md.
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

export default async (connection: PoolClient) => {
  for (const [from, to] of ADDRESS_RENAMES) {
    await renameColumn(connection, 'customer_address', from, to);
  }
  await execute(
    connection,
    `ALTER TABLE "customer_address"
       ADD COLUMN IF NOT EXISTS "organization"       varchar,
       ADD COLUMN IF NOT EXISTS "address_line_3"     varchar,
       ADD COLUMN IF NOT EXISTS "dependent_locality" varchar,
       ADD COLUMN IF NOT EXISTS "sorting_code"       varchar,
       ADD COLUMN IF NOT EXISTS "given_name"         varchar,
       ADD COLUMN IF NOT EXISTS "family_name"        varchar,
       ADD COLUMN IF NOT EXISTS "extra"              jsonb`
  );
};
