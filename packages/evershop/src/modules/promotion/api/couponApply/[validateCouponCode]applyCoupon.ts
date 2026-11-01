import { translate } from '../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { findCartByUUID } from '../../../checkout/services/getCartByUUID.js';
import { saveCart } from '../../../checkout/services/saveCart.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { coupon } = request.body;
    const cart = await findCartByUUID(cart_id);
    if (!cart) {
      response.status(NOT_FOUND);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: NOT_FOUND
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
