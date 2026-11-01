import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
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
    const { note } = request.body;
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
      // Save shipping note
      await cart.setData('shipping_note', note);
      // Save the cart
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          note
        }
      };
      next();
    }
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: translate('Failed to set shipping note'),
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
