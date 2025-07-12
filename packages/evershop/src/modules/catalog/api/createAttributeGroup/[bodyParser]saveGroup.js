import {
  startTransaction,
  insert,
  commit,
  rollback,
  select
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  const data = request.body;
  try {
    await startTransaction(connection);
    const result = await insert('attribute_group')
      .given(data)
      .execute(connection);
    await commit(connection);

    const group = await select()
      .from('attribute_group')
      .where('attribute_group_id', '=', result.insertId)
      .load(pool);

    response.status(OK);
    response.json({
      data: {
        ...group
      }
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
