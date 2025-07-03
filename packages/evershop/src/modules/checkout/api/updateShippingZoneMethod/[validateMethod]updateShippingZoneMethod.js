import {
  rollback,
  commit,
  startTransaction,
  select,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const { method_id, zone_id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  let {
    cost,
    condition_type,
    calculate_api,
    price_based_cost,
    weight_based_cost,
    min,
    max
  } = request.body;
  const { is_enabled, calculation_type } = request.body;
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

    const updateZoneMethod = await update('shipping_zone_method')
      .given({
        cost,
        is_enabled,
        calculate_api,
        condition_type,
        price_based_cost,
        weight_based_cost,
        max,
        min
      })
      .where('method_id', '=', zoneMethod.shipping_method_id)
      .and('zone_id', '=', shippingZone.shipping_zone_id)
      .execute(connection, false);
    await commit(connection);
    response.status(OK);
    response.json({
      data: updateZoneMethod
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
