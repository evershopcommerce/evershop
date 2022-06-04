const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  // Handle filter
  if (request.query.start_date !== undefined) {
    const query = stack.queryInit;
    if (/^[0-9]+[-][0-9]+$/.test(request.query.start_date)) {
      const ranges = request.query.start_date.split('-');
      query.andWhere('coupon.`start_date`', '>=', ranges[0]);
      query.andWhere('coupon.`start_date`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { start_date: { from: ranges[0], to: ranges[1] } } } });
    } else if (/^[0-9]+[-]$/.test(request.query.start_date)) {
      const ranges = request.query.start_date.split('-');
      query.andWhere('coupon.`start_date`', '>=', ranges[0]);
      assign(response.context, { grid: { currentFilter: { start_date: { from: ranges[0], to: undefined } } } });
    } else if (/^[-][0-9]+$/.test(request.query.start_date)) {
      const ranges = request.query.start_date.split('-');
      query.andWhere('coupon.`start_date`', '<=', ranges[1]);
      assign(response.context, { grid: { currentFilter: { start_date: { from: undefined, to: ranges[1] } } } });
    } else return;
  }
};
