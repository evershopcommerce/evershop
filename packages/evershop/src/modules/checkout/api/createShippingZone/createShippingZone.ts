import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import {
  normalizeZonePayload,
  ZonePayloadError
} from '../../services/shipping/normalizeZonePayload.js';

/**
 * Create a shipping zone: `{ name, countries, regions }` (spec § 3.3, D-22).
 * Region keys are validated against the active regions of their country;
 * countries outside the merchant's sell-to list are accepted and reported in
 * `warnings` (§ 3.13, "intent wins, logistics is flagged").
 */
export default async (request: EvershopRequest, response, next) => {
  let payload;
  try {
    payload = await normalizeZonePayload(request.body);
  } catch (e) {
    if (e instanceof ZonePayloadError) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: { status: INVALID_PAYLOAD, message: e.message }
      });
    }
    throw e;
  }
  const { name, countries, regions, warnings } = payload;

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const zone = await insert('shipping_zone')
      .given({ name })
      .execute(connection);
    const zoneId = zone.insertId;

    for (const country of countries) {
      await insert('shipping_zone_country')
        .given({ zone_id: zoneId, country })
        .execute(connection);
    }
    for (const { country, level, key } of regions) {
      await insert('shipping_zone_region')
        .given({ zone_id: zoneId, country, level, region_key: key })
        .execute(connection);
    }

    // Auto-attach the built-in Core provider so the zone offers Core methods
    // (with admin-defined rates) out of the box. `'core'` is guaranteed to
    // resolve at runtime because `modules/checkout/bootstrap.ts` calls
    // `registerShippingProvider(coreShippingProvider)` at startup — no
    // sibling-table lookup needed. Admin can detach afterwards via the
    // Attach Provider dialog.
    await insert('shipping_zone_provider')
      .given({
        zone_id: zoneId,
        provider_code: 'core',
        is_enabled: true
      })
      .execute(connection);

    await commit(connection);
    response.status(OK);
    return response.json({ data: zone, warnings });
  } catch (e) {
    error(e);
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
