import {
  rollback,
  insert,
  commit,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { name, country, provinces = [] } = request.body;
  try {
    const zone = await insert('shipping_zone')
      .given({
        name,
        country
      })
      .execute(connection);

    const zoneId = zone.insertId;
    const provincePromises = provinces
      .filter((p) => !!p)
      .map((province) =>
        insert('shipping_zone_province')
          .given({
            zone_id: zoneId,
            province
          })
          .execute(connection)
      );
    await Promise.all(provincePromises);
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
