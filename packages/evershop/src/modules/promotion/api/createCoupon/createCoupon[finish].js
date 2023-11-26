const createCoupon = require('../../services/coupon/createCoupon');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const coupon = await createCoupon(request.body, {
    routeId: request.currentRoute.id
  });

  return coupon;
};
