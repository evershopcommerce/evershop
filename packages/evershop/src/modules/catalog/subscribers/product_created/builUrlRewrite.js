import { insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

export default async function buildUrlReWrite(data) {
  try {
    const productId = data.product_id;
    const productUuid = data.uuid;
    const categoryId = data.category_id;
    const productDescription = await select()
      .from('product_description')
      .where('product_description_product_id', '=', productId)
      .load(pool);

    if (!productDescription) {
      return;
    }
    // Insert a new url rewrite for the product itself
    await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
      .given({
        entity_type: 'product',
        entity_uuid: productUuid,
        request_path: `/${productDescription.url_key}`,
        target_path: `/product/${productUuid}`
      })
      .execute(pool);

    // Load the category
    const category = await select()
      .from('category')
      .where('category_id', '=', categoryId)
      .load(pool);

    if (!category) {
      return;
    }

    // Get the url_rewrite for the category
    const categoryUrlRewrite = await select()
      .from('url_rewrite')
      .where('entity_uuid', '=', category.uuid)
      .and('entity_type', '=', 'category')
      .load(pool);

    if (!categoryUrlRewrite) {
      // Wait for the category event to be fired and create the url rewrite for product
      return;
    } else {
      await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
        .given({
          entity_type: 'product',
          entity_uuid: productUuid,
          request_path: `${categoryUrlRewrite.request_path}/${productDescription.url_key}`,
          target_path: `/product/${productUuid}`
        })
        .execute(pool);
    }
  } catch (e) {
    error(e);
  }
}
