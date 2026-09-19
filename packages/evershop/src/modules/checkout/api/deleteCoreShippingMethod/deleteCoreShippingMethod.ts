import { del, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { CoreShippingMethodRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';

/**
 * Delete a Core shipping method. CASCADE on the FK removes all
 * `core_shipping_method_rate` rows for this method automatically.
 *
 * Active carts that selected this method will surface a "method no longer
 * available" error on next recompute via the cart's shipping_method_data
 * resolver (validateMethod returns null). The selection is cleared at that
 * point so the customer re-picks at checkout.
 */
export default async (request: EvershopRequest, response, next) => {
  const { id } = request.params;
  try {
    const row = (await select()
      .from('core_shipping_method')
      .where('uuid', '=', id)
      .load(pool)) as CoreShippingMethodRow | undefined;
    if (!row) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Core method not found' }
      });
      return;
    }
    await del('core_shipping_method').where('uuid', '=', id).execute(pool);
    response.status(OK);
    response.json({ data: row });
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
