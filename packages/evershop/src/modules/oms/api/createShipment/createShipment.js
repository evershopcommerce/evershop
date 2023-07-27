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
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { id } = request.params;
  const { carrier, tracking_number } = request.body;
  try {
    const order = await select()
      .from('order')
      .where('uuid', '=', id)
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
      .where('shipment_order_id', '=', order.order_id)
      .load(connection);

    if (shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipment was created'
        }
      });
      return;
    }
    const result = await insert('shipment')
      .given({
        shipment_order_id: order.order_id,
        carrier,
        tracking_number
      })
      .execute(connection);

    /* Update Shipment status to shipped */
    await update('order')
      .given({ shipment_status: 'shipped' })
      .where('order_id', '=', order.order_id)
      .execute(connection);

    /* Add an activity log message */
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Order was shipped',
        customer_notified: 0 // TODO: Send email to customer for shipment
      })
      .execute(connection);

    await commit(connection);

    const shipmentData = await select()
      .from('shipment')
      .where('shipment_id', '=', result.insertId)
      .load(pool);

    response.status(OK);
    response.$body = {
      data: shipmentData
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
