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
  const { class_id } = request.params;
  const { name, country, province, postcode, rate, is_compound, priority } =
    request.body;
  try {
    const taxClass = await select()
      .from('tax_class')
      .where('uuid', '=', class_id)
      .load(connection);

    if (!taxClass) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Tax class not found'
        }
      });
      return;
    }

    const taxRate = await insert('tax_rate')
      .given({
        name,
        country,
        province,
        postcode,
        rate,
        is_compound,
        priority,
        tax_class_id: taxClass.tax_class_id
      })
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: taxRate
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
