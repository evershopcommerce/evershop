import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Drop `category.include_in_nav`.
 *
 * Storefront navigation is now built with the menu widget (BasicMenu), not by
 * flagging categories for inclusion in a category-driven menu. The column and
 * its only non-UI reader — the legacy `Query.menu` resolver (`cms` module,
 * removed alongside this migration) — are no longer used anywhere.
 *
 * `DROP COLUMN IF EXISTS` keeps the migration idempotent and safe on installs
 * where the column is already absent.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `ALTER TABLE "category" DROP COLUMN IF EXISTS "include_in_nav"`
  );
};
