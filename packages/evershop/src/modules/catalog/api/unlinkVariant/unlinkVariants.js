import { update } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  try {
    await update('product')
      .given({ variant_group_id: null, visibility: null })
      .where('product_id', '=', parseInt(`0${request.body.id}`, 10))
      .execute(connection);
    response.status(OK).json({
      data: {}
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
