import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Address Format Registry — `tax_rate` follows the address vocabulary:
 * `province` → `administrative_area`, `postcode` → `postal_code`. Both stay
 * `varchar NOT NULL DEFAULT '*'` (defaults survive a rename) and keep their
 * comma-separated, `*`-wildcard semantics in `getTaxRates.js`. Metadata-only,
 * guarded, no `UPDATE`. Deploy only together with PR3.
 */

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
  await renameColumn(connection, 'tax_rate', 'province', 'administrative_area');
  await renameColumn(connection, 'tax_rate', 'postcode', 'postal_code');
};
