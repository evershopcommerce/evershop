import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Index `url_redirect.to_path`.
 *
 * `recordRedirect`/`recordRedirectsBatch` run a "collapse" step on every capture:
 * `UPDATE url_redirect SET to_path = ... WHERE to_path = <vacated path>` (so
 * A->B plus B->C becomes A->C). Without an index on `to_path` that is a sequential
 * scan of the whole table, which turns a category rename/reparent — one collapse
 * per moved descendant — into O(descendants × table_size) work as the redirect
 * table grows over the store's lifetime. `from_path` already has the UNIQUE index
 * the reclaim/upsert steps use; this covers the collapse.
 *
 * See wiki/url-redirects.md.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_URL_REDIRECT_TO_PATH" ON url_redirect ("to_path")`
  );
};
