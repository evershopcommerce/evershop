import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * `url_redirect` — keep an old friendly URL alive after an entity's `url_key`
 * changes. A `notFound`-gated middleware 302s `from_path` -> `to_path`; capture
 * runs in the entity update services (see PR4). Separate from `url_rewrite`
 * (which is an internal rewrite, not an HTTP redirect).
 *
 * Path-keyed: `from_path` is the lookup key and must resolve to exactly one
 * target, so it is UNIQUE and `entity_urn` is deliberately NOT part of the key.
 * `from_path`/`to_path` are unbounded `varchar` (deep nested category paths
 * exceed 255). No `language` column (URLs are prefix-localized) and no `type`
 * column (all redirects are 302 for now).
 *
 * See wiki/url-redirects.md.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE url_redirect (
      "url_redirect_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "from_path" varchar NOT NULL,
      "to_path" varchar NOT NULL,
      "entity_urn" varchar(255) DEFAULT NULL,
      "source" varchar NOT NULL DEFAULT 'auto',
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "URL_REDIRECT_FROM_PATH_UNIQUE" UNIQUE ("from_path")
    )`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_URL_REDIRECT_ENTITY_URN" ON url_redirect ("entity_urn") WHERE "entity_urn" IS NOT NULL`
  );
};
