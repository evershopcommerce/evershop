const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (parseInt(request.query.status, 10) === 0 || parseInt(request.query.status, 10) === 1) {
    const query = stack.queryInit;
    query.andWhere('cms_page.`status`', '=', parseInt(request.query.status, 10));
    assign(response.context, {
      grid: {
        currentFilter: {
          status: parseInt(request.query.status, 10)
        }
      }
    });
  }
};
