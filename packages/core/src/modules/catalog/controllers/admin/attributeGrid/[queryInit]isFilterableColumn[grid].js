const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (parseInt(request.query.is_filterable) === 0 || parseInt(request.query.is_filterable) === 1) {
    const query = stack.queryInit;
    query.andWhere('attribute.`is_filterable`', '=', parseInt(request.query.is_filterable));
    assign(response.context, { grid: { currentFilter: { is_filterable: parseInt(request.query.is_filterable) } } });
  }
};
