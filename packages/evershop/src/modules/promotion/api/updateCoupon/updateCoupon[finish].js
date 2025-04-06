import updateCoupon from '../../services/coupon/updateCoupon.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const coupon = await updateCoupon(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });

  return coupon;
};
