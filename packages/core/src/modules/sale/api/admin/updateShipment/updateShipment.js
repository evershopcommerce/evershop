const {
  rollback, insert, commit, select, update, startTransaction
} = require('@evershop/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');
const { get } = require('../../../../../lib/util/get');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { orderId } = request.params;
  const carrierName = get(request, 'body.carrier_name');
  const trackingNumber = get(request, 'body.tracking_number');
  try {
    const order = await select()
      .from('order')
      .where('order_id', '=', orderId)
      .load(connection);

    if (!order) {
      throw new Error('Requested order does not exist');
    }
    const shipment = await select()
      .from('shipment')
      .where('shipment_order_id', '=', orderId)
      .load(connection);

    if (!shipment) {
      throw new Error('Order was not fullfilled');
    }
    await update('shipment')
      .given({
        carrier_name: carrierName,
        tracking_number: trackingNumber
      })
      .where('shipment_order_id', '=', orderId)
      .execute(connection);
    /* Add an activity log message */
    // TODO: This will be improved. It should be treated as a side effect and move to somewhere else
    await insert('order_activity').given({
      order_activity_order_id: orderId,
      comment: 'Updated tracking number',
      customer_notified: 0
    }).execute(connection);

    await commit(connection);
    response.json({
      data: {},
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
