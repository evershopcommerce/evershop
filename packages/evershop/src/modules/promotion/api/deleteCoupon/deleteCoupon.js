import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import deleteCoupon from '../../services/coupon/deleteCoupon.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
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
