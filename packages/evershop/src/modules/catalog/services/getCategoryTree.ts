import { pool as appPool } from '../../../lib/postgres/connection.js';
import { PoolLike } from './recommendation/applyRecommendationGating.js';

export interface CategoryTreeNode {
  categoryId: number;
  uuid: string;
  name: string;
  /** 0 for a root category, 1 for its children, and so on. */
  depth: number;
}

interface CategoryTreeRow {
  category_id: number;
  uuid: string;
  name: string;
  depth: number;
}

/**
 * Every enabled category, flattened into tree order with a depth, for the
 * `/products` category facet.
 *
 * The category page's facet uses `category.children` — one level, already in
 * hand. A store-wide listing has no current category, and offering only root
 * categories would be a department switcher rather than a filter: products sit
 * on leaves, so a root is rarely what a shopper wants to narrow to. Returning
 * the whole tree lets them pick any level, and the subtree-aware `cat` filter
 * (see registerDefaultProductCollectionFilters) makes every level match.
 *
 * Ordering: siblings by `category.position` then name, which is the order the
 * merchant sees in admin. The recursive CTE carries a text sort path so the
 * flattened list comes back depth-first — a parent is always immediately
 * followed by its own descendants, which is what makes indentation readable.
 * `position` is a nullable smallint, so it is zero-padded to sort numerically
 * inside the text path rather than lexically ("10" before "9").
 *
 * Disabled categories are excluded, and so are their descendants — an enabled
 * child of a disabled parent is unreachable on the storefront, so offering it
 * as a filter would produce a dead-end.
 */
export async function getCategoryTree(
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<CategoryTreeNode[]> {
  const { rows } = await pool.query(
    `WITH RECURSIVE tree AS (
      SELECT
        c.category_id,
        c.uuid,
        COALESCE(cd.name, '') AS name,
        0 AS depth,
        ARRAY[
          LPAD(COALESCE(c.position, 0)::text, 6, '0') || ':' || COALESCE(cd.name, '')
        ] AS sort_path
      FROM category c
      LEFT JOIN category_description cd
        ON cd.category_description_category_id = c.category_id
      WHERE c.parent_id IS NULL AND c.status = true
      UNION ALL
      SELECT
        c.category_id,
        c.uuid,
        COALESCE(cd.name, '') AS name,
        t.depth + 1,
        t.sort_path || (
          LPAD(COALESCE(c.position, 0)::text, 6, '0') || ':' || COALESCE(cd.name, '')
        )
      FROM category c
      INNER JOIN tree t ON c.parent_id = t.category_id
      LEFT JOIN category_description cd
        ON cd.category_description_category_id = c.category_id
      WHERE c.status = true
    )
    SELECT category_id, uuid, name, depth FROM tree ORDER BY sort_path`
  );

  return (rows as CategoryTreeRow[]).map((row) => ({
    categoryId: row.category_id,
    uuid: row.uuid,
    name: row.name,
    depth: row.depth
  }));
}
