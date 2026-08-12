import {
  execute,
  insertOnUpdate,
  select
} from '@evershop/postgres-query-builder';
import { EventSubscriber } from '../../../../lib/event/subscriber.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

const buildUrlReWrite: EventSubscriber<'category_updated'> = async (data) => {
  try {
    const categoryUUid = data.uuid;
    const categoryId = data.category_id;
    // Load the category
    const category = await select()
      .from('category')
      .where('category_id', '=', categoryId)
      .load(pool);

    if (!category) {
      return;
    }

    // Load the parent categories
    const parentCategoriesQuery = await execute(
      pool,
      `WITH RECURSIVE parent_categories AS (
      SELECT * FROM category WHERE category_id = ${categoryId}
      UNION
      SELECT c.* FROM category c
      INNER JOIN parent_categories pc ON c.category_id = pc.parent_id
    ) SELECT * FROM parent_categories`
    );
    const parentCategories = parentCategoriesQuery.rows;
    // Build the url rewrite base on the category path, join the category_description table to get the url_key
    let path = '';
    for (let i = 0; i < parentCategories.length; i += 1) {
      const cat = parentCategories[i];
      const urlKey = await select('url_key')
        .from('category_description')
        .where('category_description_category_id', '=', cat.category_id)
        .load(pool);
      path = `/${urlKey.url_key}${path}`;
    }
    // Save the current path
    const currentPath = await select('request_path')
      .from('url_rewrite')
      .where('entity_uuid', '=', categoryUUid)
      .and('entity_type', '=', 'category')
      .load(pool);

    // Insert the url rewrite rule to the url_rewrite table
    await insertOnUpdate('url_rewrite', ['entity_uuid'])
      .given({
        entity_type: 'category',
        entity_uuid: categoryUUid,
        request_path: path,
        target_path: `/category/${categoryUUid}`
      })
      .execute(pool);

    // Cascade the path change to every descendant sub-category and product.
    // Boundary-anchored (`LIKE old || '/%'`) so we touch only rows genuinely
    // UNDER the old path, and swap only the LEADING prefix — this mirrors
    // remapPath() (services/redirect/pathRemap.ts) in SQL, so the paths written
    // here equal the redirect targets updateCategory records pre-commit. A plain
    // REPLACE() would (a) corrupt a prefix-collision sibling like `/shoe-sale`
    // when the category is `/shoe`, and (b) mangle a descendant that repeats the
    // segment (`/cat/cat-toy` -> `/animal/animal-toy`).
    if (currentPath && currentPath.request_path !== path) {
      await pool.query(
        `UPDATE url_rewrite
            SET request_path = $2 || substring(request_path FROM length($1) + 1)
          WHERE entity_type IN ('category', 'product')
            AND entity_uuid != $3
            AND request_path LIKE $1 || '/%'`,
        [currentPath.request_path, path, categoryUUid]
      );
    }
  } catch (err) {
    error(err);
  }
};

export default buildUrlReWrite;
