import { insert, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { CoreShippingMethodRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';

interface CreateCoreShippingMethodBody {
  name: string;
  is_enabled?: boolean;
  sort_order?: number;
  default_carrier_code?: string | null;
  default_service_code?: string | null;
}

/**
 * Create a Core shipping method (a row in `core_shipping_method`). Per-zone
 * rates are configured via the separate /rates endpoint after creation.
 */
export default async (request: EvershopRequest, response, next) => {
  const {
    name,
    is_enabled,
    sort_order,
    default_carrier_code,
    default_service_code
  } = request.body as CreateCoreShippingMethodBody;
  try {
    const existing = (await select()
      .from('core_shipping_method')
      .where('name', '=', name)
      .load(pool)) as CoreShippingMethodRow | undefined;
    if (existing) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `A Core method with name "${name}" already exists`
        }
      });
      return;
    }
    const result = await insert('core_shipping_method')
      .given({
        name,
        is_enabled: is_enabled ?? true,
        sort_order: sort_order ?? 0,
        default_carrier_code: default_carrier_code ?? null,
        default_service_code: default_service_code ?? null
      })
      .execute(pool);
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
