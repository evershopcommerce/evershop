const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.grand_total !== undefined) {
    const query = stack.queryInit;
    if (/^\d+(\.\d+)?[-]\d+(\.\d+)?$/.test(request.query.grand_total)) {
      const ranges = request.query.grand_total.split('-');
      query.andWhere('`order`.`grand_total`', '>=', ranges[0]);
      query.andWhere('`order`.`grand_total`', '<=', ranges[1]);
      assign(response.context, {
        grid: { currentFilter: { grand_total: { from: ranges[0], to: ranges[1] } } }
      });
    } else if (/^\d+(\.\d+)?[-]$/.test(request.query.grand_total)) {
      const ranges = request.query.grand_total.split('-');
      query.andWhere('`order`.`grand_total`', '>=', ranges[0]);
      assign(response.context, {
        grid: { currentFilter: { grand_total: { from: ranges[0], to: undefined } } }
      });
    } else if (/^[-]\d+(\.\d+)?$/.test(request.query.grand_total)) {
      const ranges = request.query.grand_total.split('-');
      query.andWhere('`order`.`grand_total`', '<=', ranges[1]);
      assign(response.context, {
        grid: { currentFilter: { grand_total: { from: undefined, to: ranges[1] } } }
      });
    }
  }
};
