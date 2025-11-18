import { execute } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { EventSubscriber } from '../../../../lib/event/subscriber.js';

const buildUrlReWrite: EventSubscriber<'product_deleted'> = async (data) => {
  const productUuid = data.uuid;

  // Delete the url rewrite for the product
  await execute(
    pool,
    `DELETE FROM url_rewrite WHERE entity_uuid = '${productUuid}' AND entity_type = 'product'`
  );
};

export default buildUrlReWrite;
