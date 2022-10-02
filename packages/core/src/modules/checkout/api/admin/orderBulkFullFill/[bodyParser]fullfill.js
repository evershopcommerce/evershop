const {
  rollback, insert, commit, select, update, startTransaction
} = require('@evershop/mysql-query-builder');
const config = require('config');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const orderIds = request.body.ids;
    const query = select()
      .from('order');
    query.leftJoin('shipment')
      .on('shipment_order_id', '=', 'order_id');
    query.where('order_id', 'IN', orderIds)
      .and('shipment_id', 'IS', null);
    const orders = await query
      .load(connection);

    if (!orders) {
      throw new Error('Requested orders are either fullfilled or do not exist');
    }
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      await insert('shipment')
        .given({
          shipment_order_id: order.order_id,
          carrier_name: '', // For bulk fullfill, we don't have carrier name
          tracking_number: ''
        })
        .execute(connection);

      /* Update Shipment status to fullfilled */
      const shipmentStatus = config.get('order.shipmentStatus');
      if (shipmentStatus.find((s) => s.code === 'fullfilled')) {
        await update('order')
          .given({ shipment_status: 'fullfilled' })
          .where('order_id', '=', order.order_id)
          .execute(connection);
      }

      /* Add an activity log message */
      // TODO: This will be improved. It should be treated as a side effect and move to somewhere else
      await insert('order_activity').given({
        order_activity_order_id: orderId,
        comment: 'Fullfilled items',
        customer_notified: 0
      }).execute(connection);
    }

    await commit(connection);
    response.json({
      data: {
        ids: orders.map((o) => o.order_id)
      },
      success: true
    });
  } catch (e) {
    await rollback(connection);
    response.json({
      data: {},
      message: e.message,
      success: false
    });
  }
};
