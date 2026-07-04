import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Drop `url_rewrite.language`.
 *
 * EverShop URLs are not translatable: locale is expressed as a URL prefix
 * (`/de/<slug>`) and the slug is shared across locales. The `language` column
 * was always written `'en'` (column default; no subscriber ever set it) and
 * never read by the request-time lookup, which keys on `request_path` alone.
 *
 * Drop it and key each rewrite row on `entity_uuid` alone. Safe because with
 * `language` constant, `entity_uuid` is already effectively unique, so the new
 * single-column constraint cannot conflict with existing rows.
 *
 * See wiki/cms-routing-redesign.md § "Coupled change: drop url_rewrite.language".
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `ALTER TABLE url_rewrite DROP CONSTRAINT "URL_REWRITE_PATH_UNIQUE"`
  );
  await execute(connection, `ALTER TABLE url_rewrite DROP COLUMN "language"`);
  await execute(
    connection,
    `ALTER TABLE url_rewrite ADD CONSTRAINT "URL_REWRITE_ENTITY_UUID_UNIQUE" UNIQUE ("entity_uuid")`
  );
};
