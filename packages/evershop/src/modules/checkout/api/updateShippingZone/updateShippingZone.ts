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

interface ProvinceEntry {
  country: string;
  province: string;
}

interface UpdateShippingZoneBody {
  name: string;
  country?: string;
  countries?: string[];
  provinces?: string[] | ProvinceEntry[];
}

interface NormalizedPayload {
  countries: string[];
  provinces: ProvinceEntry[];
}

/**
 * Same normalization as createShippingZone — see that file for details.
 */
function normalizeZonePayload(body: UpdateShippingZoneBody): NormalizedPayload {
  const countries = Array.isArray(body.countries)
    ? body.countries.filter((c) => typeof c === 'string' && c.length > 0)
    : typeof body.country === 'string' && body.country.length > 0
    ? [body.country]
    : [];

  let provinces: ProvinceEntry[] = [];
  if (Array.isArray(body.provinces)) {
    if (body.provinces.length > 0 && typeof body.provinces[0] === 'string') {
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
  const { id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body as UpdateShippingZoneBody;
  const { countries, provinces } = normalizeZonePayload(
    request.body as UpdateShippingZoneBody
  );
  try {
    const existingZone = (await select()
      .from('shipping_zone')
      .where('uuid', '=', id)
      .load(connection)) as ShippingZoneRow | undefined;
    if (!existingZone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Invalid zone id' }
      });
      await rollback(connection);
      return;
    }
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

    await update('shipping_zone')
      .given({ name })
      .where('uuid', '=', id)
      .execute(connection);

    const zoneId = existingZone.shipping_zone_id;

    // Replace shipping_zone_country rows entirely — simpler than diffing for
    // an admin-managed table with low cardinality per zone.
    await del('shipping_zone_country')
      .where('zone_id', '=', zoneId)
      .execute(connection);
    await Promise.all(
      countries.map((country) =>
        insert('shipping_zone_country')
          .given({ zone_id: zoneId, country })
          .execute(connection)
      )
    );

    // Same for shipping_zone_province.
    await del('shipping_zone_province')
      .where('zone_id', '=', zoneId)
      .execute(connection);
    await Promise.all(
      provinces.map(({ country, province }) =>
        insert('shipping_zone_province')
          .given({ zone_id: zoneId, country, province })
          .execute(connection)
      )
    );

    await commit(connection);
    response.status(OK);
    response.json({ data: { uuid: id } });
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
