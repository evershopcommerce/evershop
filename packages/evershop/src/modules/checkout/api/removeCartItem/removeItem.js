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
    const { cart_id, item_id } = request.params;
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

    const item = await cart.removeItem(item_id);
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        item: item.export()
      }
    };
    next();
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: error.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
