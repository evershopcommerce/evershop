/* eslint-disable camelcase */
const {
  rollback,
  commit,
  startTransaction,
  select,
  del
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const { method_id, zone_id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    // Load the shipping zone
    const shippingZone = await select()
      .from('shipping_zone')
      .where('uuid', '=', zone_id)
      .load(connection, false);

    if (!shippingZone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid zone id'
        }
      });
      return;
    }

    const zoneMethodQuery = select().from('shipping_method');
    zoneMethodQuery
      .innerJoin('shipping_zone_method')
      .on(
        'shipping_method.shipping_method_id',
        '=',
        'shipping_zone_method.method_id'
      );
    zoneMethodQuery
      .where('shipping_zone_method.zone_id', '=', shippingZone.shipping_zone_id)
      .and('shipping_method.uuid', '=', method_id);

    const zoneMethod = await zoneMethodQuery.load(connection, false);
    if (!zoneMethod) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid method id'
        }
      });
      return;
    }

    // Delete the shipping zone method
    await del('shipping_zone_method')
      .where('method_id', '=', zoneMethod.shipping_method_id)
      .and('zone_id', '=', shippingZone.shipping_zone_id)
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: zoneMethod
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
