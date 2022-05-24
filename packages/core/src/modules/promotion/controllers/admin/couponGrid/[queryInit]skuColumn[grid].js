const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.sku !== undefined) {
    const query = stack.queryInit;
    query.andWhere('product.`sku`', 'LIKE', `%${request.query.sku}%`);
    assign(response.context, { grid: { currentFilter: { sku: request.query.sku } } });
  }
};
