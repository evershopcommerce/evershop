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
    const { email } = request.body;
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
      await cart.setData('customer_email', email);
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          email: cart.getData('customer_email')
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
