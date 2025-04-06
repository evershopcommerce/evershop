import createCoupon from '../../services/coupon/createCoupon.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const coupon = await createCoupon(request.body, {
    routeId: request.currentRoute.id
  });

  return coupon;
};
