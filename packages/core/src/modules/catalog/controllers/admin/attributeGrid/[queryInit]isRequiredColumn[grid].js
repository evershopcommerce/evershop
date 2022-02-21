const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (parseInt(request.query.is_required) === 0 || parseInt(request.query.is_required) === 1) {
    const query = stack.queryInit;
    query.andWhere('attribute.`is_required`', '=', parseInt(request.query.is_required));
    assign(response.context, { grid: { currentFilter: { is_required: parseInt(request.query.is_required) } } });
  }
};
