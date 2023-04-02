/* eslint-disable no-unused-vars */
const { del, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  try {
    const { id } = request.params;
    const query = select().from('collection');
    const collection = await query.where('uuid', '=', id).load(pool);

    if (!collection) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Collection not found'
        }
      });
      return;
    }

    await del('collection').where('uuid', '=', id).execute(pool);
    response.status(OK);
    response.json({
      data: collection
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
