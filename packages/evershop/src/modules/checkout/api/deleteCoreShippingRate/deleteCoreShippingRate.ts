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
import deleteCoreShippingRate from '../../services/shipping/core/deleteCoreShippingRate.js';

/**
 * Delete a Core method's per-zone rate, identified by the rate `uuid` in the
 * path. The method itself stays; it simply stops being offered in that zone
 * until a new rate is created.
 */
export default async (request: EvershopRequest, response, next) => {
  const { uuid } = request.params as { uuid: string };
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

    await deleteCoreShippingRate(uuid);

    response.status(OK);
    response.json({ data: { deleted: true } });
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
