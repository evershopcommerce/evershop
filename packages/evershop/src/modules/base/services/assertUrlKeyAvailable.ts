import { select } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';
import { getRoutes } from '../../../lib/router/Router.js';
import { getEnabledLanguages } from '../../setting/services/setting.js';

/**
 * Reject a `url_key` that would be unreachable or ambiguous at the storefront.
 * Runs at the SERVICE layer (the REST APIs are a public surface and the checks
 * are dynamic — they depend on the live route table + DB):
 *
 * - equals a single-segment static frontStore route (e.g. `/cart`) — the route
 *   matcher wins before the `url_rewrite` fallback, so the entity would 404;
 * - equals an enabled locale code — the locale-prefix stripper consumes it
 *   before the matcher, shadowing the entity;
 * - already owned by another entity **of the same type** in `url_rewrite`.
 *
 * Cross-type collisions are ALLOWED — a landing page and a CMS page may share a
 * slug — and resolved at request time by the fallback's `entity_type` precedence
 * (landing wins). See wiki/landing-pages.md. Pass the caller's `entityType`
 * (`'cms_page'`, `'landing_page'`, …) so only same-type duplicates are rejected.
 */
export async function assertUrlKeyAvailable(
  connection: PoolClient,
  urlKey: string,
  selfUuid: string | null,
  entityType: string
): Promise<void> {
  const path = `/${urlKey}`;

  const reserved = getRoutes()
    .filter(
      (r: any) => !r.isAdmin && !r.isApi && /^\/[a-zA-Z0-9-]+$/.test(r.path)
    )
    .map((r: any) => r.path);
  if (reserved.includes(path)) {
    throw new Error(
      `URL key "${urlKey}" is reserved by a system route and would be unreachable.`
    );
  }

  const locales = await getEnabledLanguages();
  if (locales.includes(urlKey)) {
    throw new Error(
      `URL key "${urlKey}" conflicts with an enabled language code and would be unreachable.`
    );
  }

  const rows = await select()
    .from('url_rewrite')
    .where('request_path', '=', path)
    .execute(connection);
  if (
    rows.some(
      (r: any) => r.entity_uuid !== selfUuid && r.entity_type === entityType
    )
  ) {
    throw new Error(
      `URL key "${urlKey}" is already in use by another ${entityType.replace(
        /_/g,
        ' '
      )}.`
    );
  }
}
