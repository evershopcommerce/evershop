const {
  startTransaction,
  insert,
  commit,
  rollback,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection,
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
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
