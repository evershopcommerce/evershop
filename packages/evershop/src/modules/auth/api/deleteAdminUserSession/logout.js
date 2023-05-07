const { del } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const sid = request.params.id;
    // Delete the session from the database
    await del('user_token_secret').where('sid', '=', sid).execute(pool);

    return response.status(OK).json({
      data: {}
    });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
