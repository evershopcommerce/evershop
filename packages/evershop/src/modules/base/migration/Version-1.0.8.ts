import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * `url_redirect.status_code` — the HTTP status the storefront answers with.
 *
 * Until now every redirect was a 302, which is right for the redirects core
 * records when a `url_key` changes (the old address may come back). A store
 * moved from another platform needs 301, so that search engines carry the old
 * address's ranking to the new one: the import module writes its
 * `redirect_from` paths with 301. Existing rows keep 302 (the column default).
 *
 * See wiki/url-redirects.md.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `ALTER TABLE "url_redirect"
       ADD COLUMN IF NOT EXISTS "status_code" SMALLINT NOT NULL DEFAULT 302`
  );
  await execute(
    connection,
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'URL_REDIRECT_STATUS_CODE_CHECK'
       ) THEN
         ALTER TABLE "url_redirect"
           ADD CONSTRAINT "URL_REDIRECT_STATUS_CODE_CHECK"
           CHECK ("status_code" IN (301, 302));
       END IF;
     END $$`
  );
};
