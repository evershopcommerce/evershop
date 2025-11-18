import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { getMyCart } from '../../services/getMyCart.js';
import { saveCart } from '../../services/saveCart.js';

export default async (request: EvershopRequest, response, next) => {
  try {
    const { item_id } = request.params;
    const { sessionID, customer } = request.locals;
    const cart = await getMyCart(sessionID || '', customer?.customer_id);
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
    const { action, qty } = request.body;
    const item = await cart.updateItemQty(item_id, qty, action);
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
