import { translate } from '../../../../lib/locale/translate/translate.js';
import {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getContextValue } from '../../../graphql/services/contextHelper.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';

export default async (request, response, next) => {
  try {
    const cartId = getContextValue(request, 'cartId');
    const { item_id } = request.params;
    if (!cartId) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    const cart = await getCartByUUID(cartId);
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
