import {
  commit,
  del,
  insert,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { ShippingZoneRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';
import {
  normalizeZonePayload,
  ZonePayloadError
} from '../../services/shipping/normalizeZonePayload.js';

/**
 * Update a shipping zone: same payload and rules as createShippingZone
 * (spec § 3.3, D-22). Countries and regions are replaced wholesale — simpler
 * than diffing for an admin-managed table with low cardinality per zone. A
 * country outside the sell-to list that is already on the zone stays
 * removable; the warning is returned either way.
 */
export default async (request: EvershopRequest, response, next) => {
  const { id } = request.params;
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
    const existingZone = (await select()
      .from('shipping_zone')
      .where('uuid', '=', id)
      .load(connection)) as ShippingZoneRow | undefined;
    if (!existingZone) {
      await rollback(connection);
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: { status: INVALID_PAYLOAD, message: 'Invalid zone id' }
      });
    }

    await update('shipping_zone')
      .given({ name })
      .where('uuid', '=', id)
      .execute(connection);

    const zoneId = existingZone.shipping_zone_id;

    await del('shipping_zone_country')
      .where('zone_id', '=', zoneId)
      .execute(connection);
    for (const country of countries) {
      await insert('shipping_zone_country')
        .given({ zone_id: zoneId, country })
        .execute(connection);
    }

    await del('shipping_zone_region')
      .where('zone_id', '=', zoneId)
      .execute(connection);
    for (const { country, level, key } of regions) {
      await insert('shipping_zone_region')
        .given({ zone_id: zoneId, country, level, region_key: key })
        .execute(connection);
    }

    await commit(connection);
    response.status(OK);
    return response.json({ data: { uuid: id }, warnings });
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
