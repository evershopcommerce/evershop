/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  select,
  update,
  startTransaction
} = require('@evershop/postgres-query-builder');
const {
  getConnection,
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { order_id, shipment_id } = request.params;
  const { carrier, tracking_number } = request.body;
  try {
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
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
      .where('uuid', '=', shipment_id)
      .load(connection);

    if (!shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid shipment id'
        }
      });
      return;
    }
    await update('shipment')
      .given({
        carrier,
        tracking_number
      })
      .where('uuid', '=', shipment_id)
      .execute(connection);
    /* Add an activity log message */
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Shipment information updated',
        customer_notified: 0
      })
      .execute(connection);

    await commit(connection);

    // Load updated shipment
    const updatedShipment = await select()
      .from('shipment')
      .where('shipment_order_id', '=', order.order_id)
      .and('uuid', '=', shipment_id)
      .load(pool);

    response.status(OK);
    response.$body = {
      data: updatedShipment
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
