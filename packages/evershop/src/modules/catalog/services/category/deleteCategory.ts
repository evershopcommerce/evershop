import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { CatalogUrn } from '../../../../lib/urn/index.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import type {
  CategoryDescriptionRow,
  CategoryRow
} from '../../../../types/db/index.js';
import {
  clearRedirectsForEntities,
  recordRedirectsBatch
} from '../../../base/services/recordRedirect.js';
import { buildEntityPath } from '../redirect/pathRemap.js';

async function deleteCategoryData(
  uuid: string,
  connection: PoolClient
): Promise<void> {
  // Deleting a category cascades in the DATABASE beyond this row: (a) the
  // DELETE_SUB_CATEGORIES_TRIGGER recursively removes every descendant
  // sub-category, and (b) the product FK is ON DELETE SET NULL, so every product
  // assigned to any category in the subtree is uncategorised — its url_rewrite is
  // rebuilt from the nested path to root `/<url_key>` post-commit (the AFTER
  // UPDATE ON product trigger fires on the SET NULL). Neither path runs through a
  // service, so we must handle their redirects here, pre-commit, while the rows
  // still hold the OLD state. See wiki/url-redirects.md.

  // The full subtree the trigger will delete: this category + all descendants.
  const subtree = await connection.query(
    `WITH RECURSIVE subtree AS (
       SELECT category_id, uuid FROM category WHERE uuid = $1
       UNION
       SELECT c.category_id, c.uuid FROM category c
       INNER JOIN subtree s ON c.parent_id = s.category_id
     ) SELECT category_id, uuid FROM subtree`,
    [uuid]
  );
  const categoryIds = subtree.rows.map((r) => r.category_id);
  const categoryUrns = subtree.rows.map((r) => CatalogUrn.category(r.uuid));

  // (b) Capture nested -> root redirects for every product about to be
  // uncategorised. Read on the tx connection BEFORE the delete, so url_rewrite
  // still holds each product's current nested path.
  const products = await connection.query(
    `SELECT p.uuid, pd.url_key, ur.request_path AS old_path
       FROM product p
       JOIN product_description pd
         ON pd.product_description_product_id = p.product_id
       LEFT JOIN url_rewrite ur
         ON ur.entity_uuid = p.uuid AND ur.entity_type = 'product'
      WHERE p.category_id = ANY($1::int[])`,
    [categoryIds]
  );
  await recordRedirectsBatch(
    connection,
    products.rows.map((p) => ({
      fromPath: p.old_path ?? `/${p.url_key}`,
      toPath: buildEntityPath(null, p.url_key),
      entityUrn: CatalogUrn.product(p.uuid)
    }))
  );

  // (a) Purge the redirect aliases owned by this category AND every descendant
  // sub-category (the trigger deletes those rows without calling this service, so
  // clearing only `uuid` would orphan their aliases).
  await clearRedirectsForEntities(connection, categoryUrns);

  await del('category').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete category service. This service will delete a category with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCategory(
  uuid: string,
  context: Record<string, any>
): Promise<CategoryRow & CategoryDescriptionRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('category');
    query
      .leftJoin('category_description')
      .on(
        'category_description.category_description_category_id',
        '=',
        'category.category_id'
      );

    const category = await query.where('uuid', '=', uuid).load(connection);

    if (!category) {
      throw new Error('Invalid category id');
    }
    await hookable(deleteCategoryData, { ...context, connection, category })(
      uuid,
      connection
    );

    await commit(connection);
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete category service. This service will delete a category with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (
  uuid: string,
  context: Record<string, any>
): Promise<CategoryRow & CategoryDescriptionRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const category = await hookable(deleteCategory, context)(uuid, context);
  return category;
};

export function hookBeforeDeleteCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCategoryData', callback, priority);
}

export function hookAfterDeleteCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCategoryData', callback, priority);
}

export function hookBeforeDeleteCategory(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCategory', callback, priority);
}

export function hookAfterDeleteCategory(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCategory', callback, priority);
}
