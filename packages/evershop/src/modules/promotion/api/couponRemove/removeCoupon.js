import { translate } from '../../../../lib/locale/index.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getCartByUUID } from '../../../checkout/services/getCartByUUID.js';
import { saveCart } from '../../../checkout/services/saveCart.js';

export default async (request, response, next) => {
  try {
    const { cart_id, coupon } = request.params;
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }
    if (cart.getData('coupon') !== coupon) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Coupon does not match'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }
    await cart.setData('coupon', null);
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
