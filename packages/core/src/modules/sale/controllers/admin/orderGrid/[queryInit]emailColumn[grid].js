const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.customer_email !== undefined) {
    const query = stack.queryInit;
    query.andWhere('`order`.`customer_email`', 'LIKE', `%${request.query.customer_email}%`);
    assign(response.context, {
      grid: { currentFilter: { customer_email: request.query.customer_email } }
    });
  }
};
