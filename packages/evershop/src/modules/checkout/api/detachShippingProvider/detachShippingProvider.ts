import { del, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { ShippingZoneRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';

/**
 * Detach a provider from a zone. Deletes the `shipping_zone_provider` row
 * keyed on (zone_id, provider_code). Provider-internal per-zone data (e.g.,
 * Core's `core_shipping_method_rate` rows that join through
 * `shipping_zone_id`) is unaffected, because that data is keyed on the
 * zone, not the attachment. Re-attaching later will re-expose existing
 * rates without admin re-entering them.
 *
 * No registry validation — the goal is to remove the attachment regardless
 * of whether the provider is currently registered (orphan-cleanup case).
 */
export default async (request: EvershopRequest, response, next) => {
  const { zone_id: zoneUuid, provider_code } = request.params;
  try {
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

    await del('shipping_zone_provider')
      .where('zone_id', '=', zone.shipping_zone_id)
      .and('provider_code', '=', provider_code)
      .execute(pool);

    response.status(OK);
    response.json({ data: { detached: true } });
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
