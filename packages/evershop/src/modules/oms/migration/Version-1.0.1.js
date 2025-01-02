const { execute, select } = require('@evershop/postgres-query-builder');
const { warning } = require('@evershop/evershop/src/lib/log/logger');
const { resolveOrderStatus } = require('../services/updateOrderStatus');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT NULL;`
  );

  // Mapping the order status for legacy orders
  const orders = await select().from('order').execute(connection);
  // eslint-disable-next-line no-restricted-syntax
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
