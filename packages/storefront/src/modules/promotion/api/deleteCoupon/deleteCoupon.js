import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteCoupon from '../../services/coupon/deleteCoupon.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const coupon = await deleteCoupon(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: coupon
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
