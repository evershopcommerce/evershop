const updateCoupon = require('../../services/coupon/updateCoupon');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const coupon = await updateCoupon(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });

  return coupon;
};
