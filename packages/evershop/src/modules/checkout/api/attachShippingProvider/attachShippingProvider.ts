import { insert, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { ShippingZoneRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { getShippingProvider } from '../../services/shipping/registry.js';

interface AttachShippingProviderBody {
  provider_code: string;
  config?: Record<string, unknown>;
  is_enabled?: boolean;
  sort_order?: number;
}

/**
 * Attach a provider to a zone. Creates a `shipping_zone_provider` row keyed
 * on `provider_code` (a soft reference into the in-memory registry — there
 * is no `shipping_provider` table). Validates the code resolves to a
 * registered provider before insert, since the DB no longer enforces it via
 * FK. Per-zone provider config (e.g., per-zone markup %) goes in `config`
 * and is validated against `provider.zoneConfigFields` at the admin UI
 * layer; this endpoint accepts any object shape.
 */
export default async (request: EvershopRequest, response, next) => {
  const { zone_id: zoneUuid } = request.params;
  const {
    provider_code,
    config,
    is_enabled,
    sort_order
  } = request.body as AttachShippingProviderBody;
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
    const provider = await getShippingProvider(provider_code);
    if (!provider) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `Shipping provider "${provider_code}" is not registered`
        }
      });
      return;
    }

    const existing = await select()
      .from('shipping_zone_provider')
      .where('zone_id', '=', zone.shipping_zone_id)
      .and('provider_code', '=', provider_code)
      .load(pool);
    if (existing) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `Provider "${provider_code}" is already attached to this zone`
        }
      });
      return;
    }

    const result = await insert('shipping_zone_provider')
      .given({
        zone_id: zone.shipping_zone_id,
        provider_code,
        config: config ?? {},
        is_enabled: is_enabled ?? true,
        sort_order: sort_order ?? 0
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
