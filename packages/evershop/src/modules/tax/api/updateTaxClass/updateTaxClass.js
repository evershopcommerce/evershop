import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const { id } = request.params;
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body;
  try {
    // Load the tax class
    const taxClass = await select()
      .from('tax_class')
      .where('uuid', '=', id)
      .load(connection);

    if (!taxClass) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid class id'
        }
      });
      return;
    }
    const newClass = await update('tax_class')
      .given({
        name
      })
      .where('uuid', '=', id)
      .execute(connection);

    await commit(connection);
    response.status(OK);
    response.json({
      data: newClass
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
