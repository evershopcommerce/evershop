import { translate } from '../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { findCartByUUID } from '../../../checkout/services/getCartByUUID.js';
import { saveCart } from '../../../checkout/services/saveCart.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const coupon = Array.isArray(request.params.coupon)
      ? request.params.coupon[0]
      : request.params.coupon;
    const cart_id = Array.isArray(request.params.cart_id)
      ? request.params.cart_id[0]
      : request.params.cart_id;
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
