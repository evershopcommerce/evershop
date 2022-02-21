const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.attribute_name !== undefined) {
    const query = stack.queryInit;
    query.andWhere('attribute.`attribute_name`', 'LIKE', `%${request.query.attribute_name}%`);
    assign(response.context, { grid: { currentFilter: { attribute_name: request.query.attribute_name } } });
  }
};
