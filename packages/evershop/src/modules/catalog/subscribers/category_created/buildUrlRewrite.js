const { error } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  execute,
  select,
  insertOnUpdate
} = require('@evershop/postgres-query-builder');

module.exports = async function buildUrlReWrite(data) {
  const categoryId = data.category_id;
  const categoryUuid = data.uuid;

  // Load the category
  const category = await select()
    .from('category')
    .where('category_id', '=', categoryId)
    .load(pool);

  if (!category) {
    return;
  }

  // Load the parent categories
  const query = await execute(
    pool,
    `WITH RECURSIVE parent_categories AS (
      SELECT * FROM category WHERE category_id = ${categoryId}
      UNION
      SELECT c.* FROM category c
      INNER JOIN parent_categories pc ON c.category_id = pc.parent_id
    ) SELECT * FROM parent_categories`
  );
  const parentCategories = query.rows;

  try {
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
    // Insert the url rewrite rule to the url_rewrite table
    await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
      .given({
        entity_type: 'category',
        entity_uuid: categoryUuid,
        request_path: path,
        target_path: `/category/${categoryUuid}`
      })
      .execute(pool);
  } catch (err) {
    error(err);
  }
};
