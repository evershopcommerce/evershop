import { select } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Resolve a category's friendly `url_rewrite` path — the prefix of every product
 * and sub-category URL under it. Returns null when `categoryId` is falsy (the
 * entity is uncategorised/root) or the category has no rewrite row yet (mirrors
 * the buildUrlRewrite subscribers, which then fall back to a root `/<url_key>`).
 * Reads on the passed transaction connection so callers see pre-commit state.
 */
export async function resolveCategoryUrlPath(
  connection: PoolClient,
  categoryId: number | null | undefined
): Promise<string | null> {
  if (!categoryId) {
    return null;
  }
  const category = await select('uuid')
    .from('category')
    .where('category_id', '=', categoryId)
    .load(connection);
  if (!category) {
    return null;
  }
  const rewrite = await select('request_path')
    .from('url_rewrite')
    .where('entity_uuid', '=', (category as any).uuid)
    .and('entity_type', '=', 'category')
    .load(connection);
  return (rewrite as any)?.request_path ?? null;
}
