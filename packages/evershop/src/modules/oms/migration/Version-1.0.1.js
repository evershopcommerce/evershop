import { execute, select } from '@evershop/postgres-query-builder';
import { warning } from '../../../lib/log/logger.js';
import { resolveOrderStatus } from '../services/updateOrderStatus.js';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT NULL;`
  );

  // Mapping the order status for legacy orders
  const orders = await select().from('order').execute(connection);

  for (const order of orders) {
    try {
      const status = resolveOrderStatus(
        order.payment_status,
        order.shipment_status
      );
      await execute(
        connection,
        `UPDATE "order" SET status = '${status}' WHERE order_id = ${order.order_id};`
      );
    } catch (err) {
      warning(
        `Error while updating order status for order_id: ${order.order_id}. 
        This happened because we can not resolve the order status. You may need to update the order status manually.`
      );
    }
  }
};
