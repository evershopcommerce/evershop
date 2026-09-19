import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { CoreShippingMethodRateRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';
import type { CoreShippingRateData } from '../../services/shipping/core/createCoreShippingRate.js';
import updateCoreShippingRate from '../../services/shipping/core/updateCoreShippingRate.js';

/**
 * Update an existing Core rate, identified by the rate `uuid` in the path.
 * Replaces the full rate state (the admin form submits every field, with the
 * unused calculation/condition branches nulled).
 *
 * `condition_type` ∈ {price, weight, null}. The provider applies half-open
 * `[min, max)` semantics — see wiki/shipping-provider-design.md.
 */
export default async (request: EvershopRequest, response, next) => {
  const { uuid } = request.params as { uuid: string };
  const body = request.body as CoreShippingRateData;
  try {
    const existing = (await select()
      .from('core_shipping_method_rate')
      .where('uuid', '=', uuid)
      .load(pool)) as CoreShippingMethodRateRow | undefined;
    if (!existing) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Core shipping rate not found' }
      });
      return;
    }

    const result = await updateCoreShippingRate(uuid, body);

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
