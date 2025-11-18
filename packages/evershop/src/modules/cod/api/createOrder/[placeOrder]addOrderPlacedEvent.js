import { select } from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { pool } from '../../../../lib/postgres/connection.js';

export default async (request, response, next) => {
  // Get the order data from $body
  const newOrder = response.$body?.data || {};
  if (newOrder.payment_method !== 'cod') {
    return next();
  } else {
    const order = await select()
      .from('order')
      .where('order_id', '=', newOrder.order_id)
      .load(pool);
    await emit('order_placed', { ...order });
    return next();
  }
};
