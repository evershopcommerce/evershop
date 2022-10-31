const {
  pool
} = require('@evershop/core/src/lib/mysql/connection');

const {
  insert
} = require('@evershop/mysql-query-builder');

module.exports = async function graphql(request, response, delegate, next) {
  try {
    const {
      body: {
        product_id,
        user_name,
        comment
      }
    } = request; // Insert the comment into the database

    await insert('product_comment').given({
      product_id,
      user_name,
      comment
    }).execute(pool);
    response.json({
      success: true
    });
  } catch (error) {
    next(error);
  }
};