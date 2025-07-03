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
  const connection = await getConnection();
  await startTransaction(connection);
  const { id } = request.params;
  const { name, country, province, postcode, rate, is_compound, priority } =
    request.body;
  try {
    const taxRate = await select()
      .from('tax_rate')
      .where('uuid', '=', id)
      .load(connection);

    if (!taxRate) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Tax rate not found'
        }
      });
      return;
    }

    const newRate = await update('tax_rate')
      .given({
        name,
        country,
        province,
        postcode,
        rate,
        is_compound,
        priority
      })
      .where('uuid', '=', id)
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: newRate
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
