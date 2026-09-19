import { select, update } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { CoreShippingMethodRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';

interface UpdateCoreShippingMethodBody {
  name?: string;
  is_enabled?: boolean;
  sort_order?: number;
  default_carrier_code?: string | null;
  default_service_code?: string | null;
}

/**
 * Update a Core shipping method's identity fields (name, enabled flag, sort
 * order). Per-zone rates are managed via the separate /rates endpoint.
 */
export default async (request: EvershopRequest, response, next) => {
  const { id } = request.params;
  const body = request.body as UpdateCoreShippingMethodBody;
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

    const given: Partial<CoreShippingMethodRow> = {};
    if (body.name !== undefined) given.name = body.name;
    if (body.is_enabled !== undefined) given.is_enabled = body.is_enabled;
    if (body.sort_order !== undefined) given.sort_order = body.sort_order;
    if (body.default_carrier_code !== undefined) {
      given.default_carrier_code = body.default_carrier_code;
    }
    if (body.default_service_code !== undefined) {
      given.default_service_code = body.default_service_code;
    }

    if (given.name && given.name !== row.name) {
      const existing = (await select()
        .from('core_shipping_method')
        .where('name', '=', given.name)
        .load(pool)) as CoreShippingMethodRow | undefined;
      if (existing) {
        response.status(INVALID_PAYLOAD);
        response.json({
          error: {
            status: INVALID_PAYLOAD,
            message: `A Core method with name "${given.name}" already exists`
          }
        });
        return;
      }
    }

    await update('core_shipping_method')
      .given(given)
      .where('uuid', '=', id)
      .execute(pool);

    const updated = (await select()
      .from('core_shipping_method')
      .where('uuid', '=', id)
      .load(pool)) as CoreShippingMethodRow;
    response.status(OK);
    response.json({ data: updated });
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
