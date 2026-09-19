import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Large-catalog indexing fixes (found load-testing a 500k-product catalog).
 *
 * 1. Index `url_rewrite.request_path`. Every storefront request resolves its
 *    URL with `WHERE request_path = $1`; the only indexes were the pkey and
 *    the `entity_uuid` unique, so each page view paid a full seq scan
 *    (~200ms at 500k rewrite rows) and thrashed the buffer cache. Not UNIQUE
 *    on purpose: slugs may collide across entity types — the lookup breaks
 *    ties with a deterministic ORDER BY instead.
 *
 * 2. Drop duplicate indexes that only amplified write cost (each is fully
 *    covered by a UNIQUE constraint on the same leading column):
 *    - FK_PRODUCT_DESCRIPTION      ⊂ PRODUCT_ID_UNIQUE
 *    - FK_CATEGORY_DESCRIPTION     ⊂ CATEGORY_ID_UNIQUE
 *    - FK_ATTRIBUTE_LINK           ⊂ ATTRIBUTE_GROUP_LINK_UNIQUE
 *    - FK_PRODUCT_ATTRIBUTE_LINK   ⊂ OPTION_VALUE_UNIQUE
 *    Referencing-side FK lookups (cascade deletes, joins) keep using the
 *    unique indexes — Postgres only requires an index on the referenced side.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "URL_REWRITE_REQUEST_PATH_INDEX"
       ON "url_rewrite" ("request_path")`
  );

  await execute(connection, `DROP INDEX IF EXISTS "FK_PRODUCT_DESCRIPTION"`);
  await execute(connection, `DROP INDEX IF EXISTS "FK_CATEGORY_DESCRIPTION"`);
  await execute(connection, `DROP INDEX IF EXISTS "FK_ATTRIBUTE_LINK"`);
  await execute(
    connection,
    `DROP INDEX IF EXISTS "FK_PRODUCT_ATTRIBUTE_LINK"`
  );
};
