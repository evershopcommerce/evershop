/* eslint-disable camelcase */
import {
  rollback,
  insert,
  commit,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
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
