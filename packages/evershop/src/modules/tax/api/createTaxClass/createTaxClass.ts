import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body;
  try {
    const taxClass = await insert('tax_class')
      .given({
        name
      })
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: taxClass
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
