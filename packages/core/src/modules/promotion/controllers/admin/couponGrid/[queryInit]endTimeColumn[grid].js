const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.end_date !== undefined) {
    const query = stack.queryInit;
    if (/^\d+(\.\d+)?[-]\d+(\.\d+)?$/.test(request.query.end_date)) {
      const ranges = request.query.end_date.split('-');
      query.andWhere('coupon.`end_date`', '>=', ranges[0]);
      query.andWhere('coupon.`end_date`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { end_date: { from: ranges[0], to: ranges[1] } } } });
    } else if (/^\d+(\.\d+)?[-]$/.test(request.query.end_date)) {
      const ranges = request.query.end_date.split('-');
      query.andWhere('coupon.`end_date`', '>=', ranges[0]);
      assign(response.context, { grid: { currentFilter: { end_date: { from: ranges[0], to: undefined } } } });
    } else if (/^[-]\d+(\.\d+)?$/.test(request.query.end_date)) {
      const ranges = request.query.end_date.split('-');
      query.andWhere('coupon.`end_date`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { end_date: { from: undefined, to: ranges[1] } } } });
    } else return;
  }
};
