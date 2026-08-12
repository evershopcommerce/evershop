import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type {
  CoreShippingMethodRateRow,
  CoreShippingMethodRow,
  ShippingZoneRow
} from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';
import createCoreShippingRate from '../../services/shipping/core/createCoreShippingRate.js';
import type { CoreShippingRateData } from '../../services/shipping/core/createCoreShippingRate.js';

interface CreateCoreShippingRateBody extends CoreShippingRateData {
  /** Core method UUID. */
  method_id: string;
  /** Shipping zone UUID. */
  zone_id: string;
}

/**
 * Create a per-zone rate for a Core method. The method and zone are passed by
 * UUID in the POST body; both are validated to exist (and that no rate already
 * covers the pair) before the rate is created.
 */
export default async (request: EvershopRequest, response, next) => {
  const body = request.body as CreateCoreShippingRateBody;
  const { method_id: methodUuid, zone_id: zoneUuid } = body;
  try {
    const method = (await select()
      .from('core_shipping_method')
      .where('uuid', '=', methodUuid)
      .load(pool)) as CoreShippingMethodRow | undefined;
    if (!method) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Core method not found' }
      });
      return;
    }

    const zone = (await select()
      .from('shipping_zone')
      .where('uuid', '=', zoneUuid)
      .load(pool)) as ShippingZoneRow | undefined;
    if (!zone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Invalid zone id' }
      });
      return;
    }

    // One rate per (method, zone) — the table enforces it; surface a clear 400
    // instead of letting the unique violation become a 500.
    const duplicate = (await select()
      .from('core_shipping_method_rate')
      .where('method_id', '=', method.core_shipping_method_id)
      .and('zone_id', '=', zone.shipping_zone_id)
      .load(pool)) as CoreShippingMethodRateRow | undefined;
    if (duplicate) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'A rate for this method and zone already exists. Edit it instead.'
        }
      });
      return;
    }

    const result = await createCoreShippingRate({
      method_id: method.core_shipping_method_id,
      zone_id: zone.shipping_zone_id,
      is_enabled: body.is_enabled,
      cost: body.cost,
      condition_type: body.condition_type,
      min: body.min,
      max: body.max,
      price_based_cost: body.price_based_cost,
      weight_based_cost: body.weight_based_cost
    });

    response.status(OK);
    response.json({ data: result });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
