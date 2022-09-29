const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  const query = select();
  query.from('coupon');
  query.where('coupon_id', '=', request.params.id);
  const coupon = await query.load(pool);
  if (coupon === null) {
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'error',
      message: 'Requested coupon does not exist'
    });
    request.session.save();
    response.redirect(302, buildUrl('couponGrid'));
  } else {
    assign(response.context, {
      coupon: Object.keys(coupon).reduce((_, c) => {
        if (['condition', 'buyx_gety', 'user_condition', 'target_products'].includes(c)) {
          _[c] = JSON.parse(coupon[c]);
        } else {
          _[c] = coupon[c];
        }
        return _;
      }, {})
    });
    assign(response.context, { page: { heading: coupon.coupon } });
    next();
  }
};
