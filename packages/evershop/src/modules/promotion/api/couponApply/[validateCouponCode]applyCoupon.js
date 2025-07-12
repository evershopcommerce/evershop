import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getCartByUUID } from '../../../checkout/services/getCartByUUID.js';
import { saveCart } from '../../../checkout/services/saveCart.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { coupon } = request.body;
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: 'Invalid cart',
          status: INVALID_PAYLOAD
        }
      });
      return;
    }
    await cart.setData('coupon', coupon);
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        coupon
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
