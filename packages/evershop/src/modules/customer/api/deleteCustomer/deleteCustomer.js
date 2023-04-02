const { select, del } = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection();
  try {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id)
      .load(connection, false);

    if (!customer) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid customer id'
        }
      });
      return;
    }

    await del('customer')
      .where('uuid', '=', request.params.id)
      .execute(connection);

    response.status(OK);
    response.json({
      data: {
        ...customer
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
