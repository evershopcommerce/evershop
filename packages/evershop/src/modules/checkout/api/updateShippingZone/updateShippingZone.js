import {
  rollback,
  commit,
  startTransaction,
  insertOnUpdate,
  del,
  select,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const { id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  const { name, country, provinces } = request.body;
  try {
    // Load the shipping zone
    const shippingZone = await select()
      .from('shipping_zone')
      .where('uuid', '=', id)
      .load(connection);

    if (!shippingZone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid zone id'
        }
      });
      return;
    }
    const zone = await update('shipping_zone')
      .given({
        name,
        country
      })
      .where('uuid', '=', id)
      .execute(connection);

    const zoneId = zone.updatedId;
    if (
      !provinces ||
      !provinces.length ||
      (provinces.length === 1 && provinces[0] === '')
    ) {
      // Delete all provinces
      await del('shipping_zone_province')
        .where('zone_id', '=', zoneId)
        .execute(connection);
    } else {
      const provincePromises = provinces.map((province) =>
        insertOnUpdate('shipping_zone_province', ['province'])
          .given({
            zone_id: zoneId,
            province
          })
          .where('zone_id', '=', zoneId)
          .execute(connection)
      );
      await Promise.all(provincePromises);
      // Delete all provinces that are not in the list
      await del('shipping_zone_province')
        .where('zone_id', '=', zoneId)
        .and('province', 'NOT IN', provinces)
        .execute(connection);
    }
    await commit(connection);
    response.status(OK);
    response.json({
      data: zone
    });
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
