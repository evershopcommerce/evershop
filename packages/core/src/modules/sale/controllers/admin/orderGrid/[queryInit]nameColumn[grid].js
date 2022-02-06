const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  if (request.query.customer_name !== undefined) {
    const query = stack.queryInit;
    query.andWhere('`order`.`customer_full_name`', 'LIKE', `%${request.query.customer_name}%`);
    assign(response.context, {
      grid: { currentFilter: { customer_name: request.query.customer_name } }
    });
  }
};
