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
    const query = select().from('category');
    query
      .leftJoin('category_description')
      .on(
        'category_description.category_description_category_id',
        '=',
        'category.category_id'
      );

    const category = await query.where('uuid', '=', id).load(pool);

    if (!category) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Category not found'
        }
      });
      return;
    }

    await del('category').where('uuid', '=', id).execute(pool);
    response.status(OK);
    response.json({
      data: category
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
