import { select } from '@evershop/postgres-query-builder';
import { EventSubscriber } from '../../../../lib/event/subscriber.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

const deleteUrlReWrite: EventSubscriber<'category_deleted'> = async (data) => {
  try {
    const categoryUuid = data.uuid;
    // Get the current url rewrite for this category
    const urlRewrite = await select()
      .from('url_rewrite')
      .where('entity_uuid', '=', categoryUuid)
      .and('entity_type', '=', 'category')
      .load(pool);
    // Delete all the url rewrite rule for this category
    await pool.query(
      `DELETE FROM url_rewrite WHERE entity_type = 'category' AND entity_uuid = $1`,
      [categoryUuid]
    );

    if (!urlRewrite) {
      return;
    } else {
      // Delete all the url rewrite rule for the sub categories and products
      await pool.query(
        `DELETE FROM url_rewrite WHERE request_path LIKE $1 AND entity_type IN ('category', 'product')`,
        [`${urlRewrite.request_path}/%`]
      );
    }
  } catch (err) {
    error(err);
  }
};

export default deleteUrlReWrite;
