const { update, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const data = request.body;
  try {
    const group = await select()
      .from('attribute_group')
      .where('uuid', '=', request.params.id)
      .load(pool);

    if (!group) {
      response.status(INVALID_PAYLOAD);
      throw new Error('Invalid attribute group id');
    }

    await update('attribute_group')
      .given(data)
      .where('uuid', '=', request.params.id)
      .execute(pool);

    const updatedGroup = await select()
      .from('attribute_group')
      .where('uuid', '=', request.params.id)
      .load(pool);

    response.status(OK);
    response.json({
      data: {
        ...updatedGroup
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
