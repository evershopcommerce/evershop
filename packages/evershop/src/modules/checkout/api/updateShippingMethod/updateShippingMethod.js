/* eslint-disable camelcase */
const {
  rollback,
  commit,
  startTransaction,
  select,
  update
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { error } = require('@evershop/evershop/src/lib/log/logger');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
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
