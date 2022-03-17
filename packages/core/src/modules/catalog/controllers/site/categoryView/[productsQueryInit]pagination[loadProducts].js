const { assign } = require('../../../../../lib/util/assign');
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
  try {
    const query = await stack.productsQueryInit;

    const page = parseInt(`0${request.query.page}`, 10) || 1;
    // Clone the main query for getting total
    const cloneQuery = query.clone();
    cloneQuery.select('COUNT(product_id)', 'total');
    const total = await cloneQuery.execute(pool);

    // Load 20 items per page,
    // TODO: Make 20 configurable
    query.limit((page - 1) * 20, 20);

    assign(response.context, {
      pagination: {
        currentPage: page,
        limit: 20,
        total: total[0].total
      }
    });
    next();
  } catch (e) {
    next(e);
  }
};
