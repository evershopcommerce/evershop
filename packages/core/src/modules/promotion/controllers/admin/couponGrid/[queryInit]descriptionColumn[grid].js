const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.description !== undefined) {
    const query = stack.queryInit;
    query.andWhere('coupon.`description`', 'LIKE', `%${request.query.description}%`);
    assign(response.context, { grid: { currentFilter: { description: request.query.description } } });
  }
};
