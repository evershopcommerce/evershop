import { translate } from '../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { findCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { method_code, method_name } = request.body;
    // Check if cart exists
    const cart = await findCartByUUID(cart_id);
    if (!cart) {
      response.status(NOT_FOUND).json({
        error: {
          message: translate('Invalid cart'),
          status: NOT_FOUND
        }
      });
    } else {
      // Save payment method
      await cart.setData('payment_method', method_code);

      // Save the cart
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          method: {
            code: method_code,
            name: method_name
          }
        }
      };
      next();
    }
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
