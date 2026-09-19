import { del, insertOnUpdate } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';
import { assertUrlKeyAvailable as assertUrlKeyAvailableBase } from '../../../base/services/assertUrlKeyAvailable.js';

interface PageRef {
  uuid: string;
  url_key: string;
}

/**
 * Keep a CMS page's `url_rewrite` row in sync with its current `url_key`.
 *
 * The friendly root URL `/<url_key>` maps to the internal `/page/<url_key>` route
 * (same `cmsPageView` handler), so the storefront serves the page at the root path
 * while the route and resolver keep working unchanged. Keyed on `entity_uuid` so a
 * rename overwrites the single row in place (the old path becomes a route-miss,
 * which the redirect feature — R2 — can later 302).
 *
 * See wiki/cms-routing-redesign.md § "Recommended design".
 */
export async function syncPageUrlRewrite(
  connection: PoolClient,
  page: PageRef
): Promise<void> {
  await insertOnUpdate('url_rewrite', ['entity_uuid'])
    .given({
      entity_type: 'cms_page',
      entity_uuid: page.uuid,
      request_path: `/${page.url_key}`,
      target_path: `/page/${page.url_key}`
    })
    .execute(connection);
}

/** Remove a page's `url_rewrite` row (on delete). */
export async function deletePageUrlRewrite(
  connection: PoolClient,
  uuid: string
): Promise<void> {
  await del('url_rewrite')
    .where('entity_uuid', '=', uuid)
    .and('entity_type', '=', 'cms_page')
    .execute(connection);
}

/**
 * Reject a CMS page `url_key` that would be unreachable or collide with another
 * CMS page. Thin wrapper over the shared base guard, pinned to `entity_type =
 * 'cms_page'`: cross-type collisions (e.g. a landing page sharing the slug) are
 * ALLOWED and resolved at request time by the fallback's precedence — see
 * base/services/assertUrlKeyAvailable + wiki/landing-pages.md.
 */
export async function assertUrlKeyAvailable(
  connection: PoolClient,
  urlKey: string,
  selfUuid: string | null = null
): Promise<void> {
  await assertUrlKeyAvailableBase(connection, urlKey, selfUuid, 'cms_page');
}
