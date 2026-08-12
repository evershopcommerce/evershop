import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Backfill `url_rewrite` rows for existing CMS pages so they get root-level
 * friendly URLs (`/<url_key>` -> internal `/page/<url_key>`), matching the
 * `syncPageUrlRewrite` service that now runs on create/update.
 *
 * Idempotent (`ON CONFLICT (entity_uuid)`), so re-runs and pages created after
 * this migration both stay consistent. Drafts are included; the `cmsPageView`
 * handler's `status = 1` gate keeps their friendly URLs 404ing consistently.
 *
 * Runs after catalog's `url_rewrite.language` drop (module order: catalog < cms),
 * so the `ON CONFLICT (entity_uuid)` target constraint already exists.
 *
 * See wiki/routing-redirects-implementation-plan.md § PR1.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `INSERT INTO url_rewrite (entity_type, entity_uuid, request_path, target_path)
     SELECT 'cms_page', p.uuid, '/' || d.url_key, '/page/' || d.url_key
     FROM cms_page p
     JOIN cms_page_description d
       ON d.cms_page_description_cms_page_id = p.cms_page_id
     ON CONFLICT (entity_uuid) DO UPDATE
       SET request_path = EXCLUDED.request_path,
           target_path = EXCLUDED.target_path,
           entity_type = EXCLUDED.entity_type`
  );
};
