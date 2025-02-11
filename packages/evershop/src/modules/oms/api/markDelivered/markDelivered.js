/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  select,
  startTransaction
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { updateShipmentStatus } = require('../../services/updateShipmentStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { order_id } = request.body;
  try {
    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order id'
        }
      });
      return;
    }
    const shipment = await select()
      .from('shipment')
      .where('shipment_order_id', '=', order_id)
      .load(connection);

    if (!shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipment was not created'
        }
      });
      return;
    }

    await updateShipmentStatus(order_id, 'delivered', connection);
    /* Add an activity log message */
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Order delivered',
        customer_notified: 0 // TODO: Add customer notification
      })
      .execute(connection);

    await commit(connection);
    response.status(OK);
    response.$body = {
      data: {
        order_id: order.order_id,
        shipment_id: shipment.shipment_id
      }
    };
    next();
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
