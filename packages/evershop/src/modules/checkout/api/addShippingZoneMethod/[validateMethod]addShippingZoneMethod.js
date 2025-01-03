/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  startTransaction,
  select
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
  const { id } = request.params;
  let {
    cost,
    calculate_api,
    condition_type,
    max,
    min,
    weight_based_cost,
    price_based_cost
  } = request.body;
  const { method_id, is_enabled, calculation_type } = request.body;

  if (calculation_type === 'api') {
    cost = weight_based_cost = price_based_cost = null;
  } else if (calculation_type === 'price_based_rate') {
    calculate_api = cost = weight_based_cost = null;
  } else if (calculation_type === 'weight_based_rate') {
    calculate_api = cost = price_based_cost = null;
  } else {
    calculate_api = weight_based_cost = price_based_cost = null;
  }
  if (condition_type === 'none') {
    condition_type = null;
    min = max = null;
  }

  const connection = await getConnection();
  await startTransaction(connection);

  try {
    const zone = await select()
      .from('shipping_zone')
      .where('uuid', '=', id)
      .load(connection);

    if (!zone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid zone id'
        }
      });
      return;
    }

    const method = await select()
      .from('shipping_method')
      .where('shipping_method_id', '=', method_id)
      .load(connection);

    if (!method) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid method id'
        }
      });
      return;
    }

    const zoneMethod = await insert('shipping_zone_method')
      .given({
        zone_id: zone.shipping_zone_id,
        method_id: method.shipping_method_id,
        cost,
        is_enabled,
        calculate_api,
        condition_type,
        price_based_cost,
        weight_based_cost,
        max,
        min
      })
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
