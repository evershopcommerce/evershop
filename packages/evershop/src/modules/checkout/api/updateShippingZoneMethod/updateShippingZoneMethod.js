/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  startTransaction
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const { method_id, zone_id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  const { cost, calculate_api, min_weight, max_weight, min_price, max_price } =
    request.body;
  try {
    // Load the shipping zone
    const shippingZone = await select()
      .from('shipping_zone')
      .where('uuid', '=', id)
      .load(connection);

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
    const zoneId = zone.insertId;
    const provincePromises = provinces.map((province) => {
      return insert('shipping_zone_province')
        .given({
          zone_id: zoneId,
          province
        })
        .execute(connection);
    });
    await Promise.all(provincePromises);
    await commit(connection);

    response.status(OK);
    response.json({
      data: zone
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
