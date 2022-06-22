const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.used_time !== undefined) {
    const query = stack.queryInit;
    if (/^[0-9]+[-][0-9]+$/.test(request.query.used_time)) {
      const ranges = request.query.used_time.split('-');
      query.andWhere('coupon.`used_time`', '>=', ranges[0]);
      query.andWhere('coupon.`used_time`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { used_time: { from: ranges[0], to: ranges[1] } } } });
    } else if (/^[0-9]+[-]$/.test(request.query.used_time)) {
      const ranges = request.query.used_time.split('-');
      query.andWhere('coupon.`used_time`', '>=', ranges[0]);
      assign(response.context, { grid: { currentFilter: { used_time: { from: ranges[0], to: undefined } } } });
    } else if (/^[-][0-9]+$/.test(request.query.used_time)) {
      const ranges = request.query.used_time.split('-');
      query.andWhere('coupon.`used_time`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { used_time: { from: undefined, to: ranges[1] } } } });
    } else return;
  }
};
