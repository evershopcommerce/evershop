import updateCoupon from '../../services/coupon/updateCoupon.js';

export default async (request, response) => {
  const coupon = await updateCoupon(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });

  return coupon;
};
