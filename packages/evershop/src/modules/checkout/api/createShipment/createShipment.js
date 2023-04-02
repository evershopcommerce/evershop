/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  select,
  update,
  startTransaction
} = require('@evershop/postgres-query-builder');
const config = require('config');
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
  const { carrier_name, tracking_number } = request.body;
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
        carrier_name,
        tracking_number
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
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Order was fullfilled',
        customer_notified: 0
      })
      .execute(connection);

    await commit(connection);

    const shipmentData = await select()
      .from('shipment')
      .where('shipment_id', '=', result.insertId)
      .load(pool);

    response.status(OK);
    response.json({
      data: shipmentData
    });
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
