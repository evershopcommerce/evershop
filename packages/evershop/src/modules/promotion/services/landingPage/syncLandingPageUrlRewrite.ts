import { del, insertOnUpdate } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

interface LandingPageRef {
  uuid: string;
  url_key: string;
}

/**
 * Keep a landing page's `url_rewrite` row in sync with its current `url_key`.
 * The friendly root URL `/<url_key>` maps to the internal `/landing/<url_key>`
 * route (`landingPageView`). Keyed on `entity_uuid` so a rename overwrites the
 * single row in place. Mirrors cms `syncPageUrlRewrite`. See wiki/landing-pages.md.
 */
export async function syncLandingPageUrlRewrite(
  connection: PoolClient,
  landingPage: LandingPageRef
): Promise<void> {
  await insertOnUpdate('url_rewrite', ['entity_uuid'])
    .given({
      entity_type: 'landing_page',
      entity_uuid: landingPage.uuid,
      request_path: `/${landingPage.url_key}`,
      target_path: `/landing/${landingPage.url_key}`
    })
    .execute(connection);
}

/** Remove a landing page's `url_rewrite` row (on delete). */
export async function deleteLandingPageUrlRewrite(
  connection: PoolClient,
  uuid: string
): Promise<void> {
  await del('url_rewrite')
    .where('entity_uuid', '=', uuid)
    .and('entity_type', '=', 'landing_page')
    .execute(connection);
}
