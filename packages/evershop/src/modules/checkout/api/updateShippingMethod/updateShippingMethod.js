import {
  rollback,
  commit,
  startTransaction,
  select,
  update
} from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body;
  const { id } = request.params;
  try {
    const method = await select()
      .from('shipping_method')
      .where('uuid', '=', id)
      .load(connection);

    if (!method) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Requested method not found'
        }
      });
      return;
    }

    const newMethod = await update('shipping_method')
      .given({
        name
      })
      .where('uuid', '=', id)
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: newMethod
    });
  } catch (e) {
    error(e);
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
