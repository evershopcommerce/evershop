/* eslint-disable camelcase */
const {
  rollback,
  insert,
  commit,
  startTransaction,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { name } = request.body;
  try {
    const method = await select()
      .from('shipping_method')
      .where('name', '=', name)
      .load(connection);

    if (method) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Method name already exists'
        }
      });
      return;
    }

    const newMethod = await insert('shipping_method')
      .given({
        name
      })
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: newMethod
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
