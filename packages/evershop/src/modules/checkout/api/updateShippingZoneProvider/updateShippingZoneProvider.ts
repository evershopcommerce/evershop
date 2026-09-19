import { select, update } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type {
  ShippingZoneProviderRow,
  ShippingZoneRow
} from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';

interface UpdateShippingZoneProviderBody {
  is_enabled?: boolean;
  config?: Record<string, unknown>;
  sort_order?: number;
}

/**
 * Update the per-zone attachment state for a provider: enabled flag,
 * per-zone config (matches `provider.zoneConfigFields`), and sort order
 * within the zone. Keyed on (zone_id, provider_code) — registry-only,
 * no provider table to dereference.
 */
export default async (request: EvershopRequest, response, next) => {
  const { zone_id: zoneUuid, provider_code } = request.params;
  const body = request.body as UpdateShippingZoneProviderBody;
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
    const attachment = (await select()
      .from('shipping_zone_provider')
      .where('zone_id', '=', zone.shipping_zone_id)
      .and('provider_code', '=', provider_code)
      .load(pool)) as ShippingZoneProviderRow | undefined;
    if (!attachment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Provider is not attached to this zone'
        }
      });
      return;
    }

    const given: Partial<ShippingZoneProviderRow> = {};
    if (body.is_enabled !== undefined) given.is_enabled = body.is_enabled;
    if (body.config !== undefined) given.config = body.config;
    if (body.sort_order !== undefined) given.sort_order = body.sort_order;

    await update('shipping_zone_provider')
      .given(given)
      .where(
        'shipping_zone_provider_id',
        '=',
        attachment.shipping_zone_provider_id
      )
      .execute(pool);

    const updated = await select()
      .from('shipping_zone_provider')
      .where(
        'shipping_zone_provider_id',
        '=',
        attachment.shipping_zone_provider_id
      )
      .load(pool);
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
