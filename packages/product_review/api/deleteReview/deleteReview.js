const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { del, select } = require('@evershop/postgres-query-builder');

module.exports = async function graphql(request, response, delegate, next) {
  try {
    const { id } = request.params;
    const review = await select('product_review')
      .where('uuid', '=', id)
      .load(pool);
    if (!review) {
      throw new Error('Review not found');
    }
    // Insert the comment into the database
    await del('product_review').where('uuid', '=', id).execute(pool);
    response.$body = {
      data: review
    };
    next();
  } catch (error) {
    next(error);
  }
};
