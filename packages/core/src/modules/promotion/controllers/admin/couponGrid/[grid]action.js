const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const coupons = get(response.context, 'grid.coupons', []);
  // eslint-disable-next-line func-names
  coupons.forEach(function (el, index) {
    this[index].editUrl = buildUrl('couponEdit', { id: parseInt(this[index].coupon_id, 10) });// TODO: This should be a part of the name column
    this[index].deleteUrl = buildUrl('couponEdit', { id: parseInt(this[index].coupon_id, 10) });
  }, coupons);

  assign(response.context, { deletecouponsUrl: buildUrl('productBulkDelete') });
  assign(response.context, { enablecouponsUrl: buildUrl('productBulkEnable') });
  assign(response.context, { disableProductUrl: buildUrl('productBulkDisable') });
};
