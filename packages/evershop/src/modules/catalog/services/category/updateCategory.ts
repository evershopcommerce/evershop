import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import type { CategoryDescriptionRow, CategoryRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import { recordRedirectsBatch } from '../../../base/services/recordRedirect.js';
import { buildEntityPath, planSubtreeRedirects } from '../redirect/pathRemap.js';
import { resolveCategoryUrlPath } from '../redirect/resolveCategoryUrlPath.js';
import { categoryDataSchema } from './categoryDataSchema.js';
import { CategoryData } from './createCategory.js';


function validateCategoryDataBeforeInsert(data: CategoryData): CategoryData {
  const ajv = getAjv();
  categoryDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCategoryDataJsonSchema',
    categoryDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateCategoryData(uuid: string, data: CategoryData, connection: PoolClient): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> {
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
    throw new Error('Requested category not found');
  }
  // Snapshot the old url_key before the description update overwrites it (below).
  const oldUrlKey = category.url_key;
  let newCategory;
  try {
    newCategory = await update('category')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(category, newCategory);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  let description;
  try {
     description = await update('category_description')
      .given(data)
      .where('category_description_category_id', '=', category.category_id)
      .execute(connection);
    Object.assign(category, description);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  // Keep old URLs alive when the category's path changes — a url_key rename, a
  // REPARENT (a parent_id change moves the whole subtree exactly as a rename
  // does), or both in one save. A category path is <ancestor url_keys>/<own
  // url_key>, so the NEW path is computed from the NEW parent chain (the parent
  // isn't moving, so its url_rewrite is current) joined with the new url_key —
  // NOT by swapping the trailing slug on the old path, which would keep a stale
  // parent prefix on a reparent and 302 users to a path that is never written.
  //
  // The whole subtree (the category itself + every descendant sub-category and
  // product) is selected at a `/`-boundary and remapped via the shared, unit-
  // tested pathRemap. This (a) targets each descendant's real new path, (b)
  // never sweeps a prefix-collision sibling like `/shoe-sale` when renaming
  // `/shoe`, and (c) never mangles a descendant that repeats the segment (e.g.
  // `/cat/cat-toy` -> `/animal/cat-toy`, not `/animal/animal-toy`). The
  // category_updated subscriber uses the SAME boundary+prefix remap in SQL, so
  // the recorded targets equal the eventual url_rewrite paths. Captured pre-
  // commit on the tx connection (rows still hold OLD paths); url_rewrite is
  // rebuilt post-commit by the subscriber. See wiki/url-redirects.md.
  const rewrite = await select()
    .from('url_rewrite')
    .where('entity_uuid', '=', uuid)
    .and('entity_type', '=', 'category')
    .load(connection);
  const oldPath = (rewrite as any)?.request_path ?? `/${oldUrlKey}`;
  const newUrlKey = (data.url_key as string) ?? oldUrlKey;
  // `category.parent_id` was merged with `newCategory` above, so it holds the
  // NEW parent after this save (or the unchanged one for a rename-only edit).
  const newParentPath = await resolveCategoryUrlPath(
    connection,
    (category as any).parent_id
  );
  const newPath = buildEntityPath(newParentPath, newUrlKey);
  if (oldPath !== newPath) {
    const subtree = await connection.query(
      `SELECT request_path, entity_uuid, entity_type FROM url_rewrite
       WHERE entity_type IN ('category', 'product')
         AND (request_path = $1 OR request_path LIKE $1 || '/%')`,
      [oldPath]
    );
    // One set-based write for the whole subtree (reclaim/collapse/upsert), not a
    // serial recordRedirect per descendant.
    await recordRedirectsBatch(
      connection,
      planSubtreeRedirects(oldPath, newPath, subtree.rows)
    );
  }

  return {
    ...description,
    ...newCategory,
    updatedId: category.category_id
  };
}

/**
 * Update category service. This service will update a category with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCategory(uuid: string, data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('categoryDataBeforeUpdate', data);
    // Validate category data
    validateCategoryDataBeforeInsert(categoryData);

    if (categoryData.description) {
      sanitizeRawHtml(categoryData.description);
    }
    // Insert category data
    const category = await hookable(updateCategoryData, {
      ...context,
      connection
    })(uuid, categoryData, connection);

    await commit(connection);
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update category service. This service will update a category with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const category = await hookable(updateCategory, context)(uuid, data, context);
  return category;
};

export function hookBeforeUpdateCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCategoryData', callback, priority);
}

export function hookAfterUpdateCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCategoryData', callback, priority);
}

export function hookBeforeUpdateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCategory', callback, priority);
}

export function hookAfterUpdateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCategory', callback, priority);
}
