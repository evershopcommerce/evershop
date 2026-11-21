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
    const { action, qty } = request.body;
    const item = await cart.updateItemQty(item_id, qty, action, { request });
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
