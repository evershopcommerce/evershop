const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.code !== undefined) {
    const query = stack.queryInit;
    query.andWhere('coupon.`code`', 'LIKE', `%${request.query.code}%`);
    assign(response.context, { grid: { currentFilter: { code: request.query.code } } });
  }
};
