import {
  commit,
  insert,
  rollback,
  select,
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

interface ProvinceEntry {
  country: string;
  province: string;
}

interface CreateShippingZoneBody {
  name: string;
  /** Legacy single-country field. New clients should send `countries`. */
  country?: string;
  countries?: string[];
  /**
   * Either a legacy array of province codes (paired with `country`), OR an
   * array of `{ country, province }` pairs for multi-country zones.
   */
  provinces?: string[] | ProvinceEntry[];
}

interface NormalizedPayload {
  countries: string[];
  provinces: ProvinceEntry[];
}

/**
 * Normalize the body's country/countries/provinces fields into:
 *   - countries: string[]  (1+ ISO country codes)
 *   - provinces: Array<{ country, province }>
 *
 * Accepts both legacy single-country payloads and the new multi-country
 * payload. Legacy provinces (`string[]`) are paired with the single country.
 */
function normalizeZonePayload(body: CreateShippingZoneBody): NormalizedPayload {
  const countries = Array.isArray(body.countries)
    ? body.countries.filter((c) => typeof c === 'string' && c.length > 0)
    : typeof body.country === 'string' && body.country.length > 0
    ? [body.country]
    : [];

  let provinces: ProvinceEntry[] = [];
  if (Array.isArray(body.provinces)) {
    if (
      body.provinces.length > 0 &&
      typeof body.provinces[0] === 'string'
    ) {
      // Legacy shape — string[] under a single country.
      const country = countries[0];
      if (country) {
        provinces = (body.provinces as string[])
          .filter((p) => typeof p === 'string' && p.length > 0)
          .map((province) => ({ country, province }));
      }
    } else {
      provinces = (body.provinces as ProvinceEntry[])
        .filter(
          (p) =>
            p &&
            typeof p === 'object' &&
            typeof p.country === 'string' &&
            typeof p.province === 'string' &&
            p.country.length > 0 &&
            p.province.length > 0
        )
        .map(({ country, province }) => ({ country, province }));
    }
  }

  return { countries, provinces };
}

export default async (request: EvershopRequest, response, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body as CreateShippingZoneBody;
  const { countries, provinces } = normalizeZonePayload(
    request.body as CreateShippingZoneBody
  );
  try {
    if (countries.length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'At least one country is required'
        }
      });
      await rollback(connection);
      return;
    }
    const zone = await insert('shipping_zone')
      .given({ name })
      .execute(connection);
    const zoneId = zone.insertId;

    await Promise.all(
      countries.map((country) =>
        insert('shipping_zone_country')
          .given({ zone_id: zoneId, country })
          .execute(connection)
      )
    );

    await Promise.all(
      provinces.map(({ country, province }) =>
        insert('shipping_zone_province')
          .given({ zone_id: zoneId, country, province })
          .execute(connection)
      )
    );

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
    response.json({ data: zone });
  } catch (e) {
    error(e);
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
