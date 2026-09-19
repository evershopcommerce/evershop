import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Metafield attribution — which theme provisioned which definition.
 *
 * One nullable column, deliberately NOT a separate provenance table (owner
 * decision 2026-07-18: keep the feature simple and cheap). NULL = created by
 * a merchant/extension; a theme name = seeded by that theme's `theme.json`
 * (or, later, the page-builder drawer). Everything else derives at read
 * time: "orphaned" = provisioned by a theme that isn't active/installed;
 * "retired" = provisioned by the active theme but absent from its current
 * manifest. Attribution drives the deletion guard (409 on deleting a
 * theme-provisioned definition — the theme would just re-seed it empty),
 * `theme:export` round-trip, and `theme:status` reporting. It survives
 * uninstall for free because it lives on the definition row itself.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `ALTER TABLE "metafield_definition"
       ADD COLUMN IF NOT EXISTS "provisioned_by_theme" varchar(255)`
  );
};
