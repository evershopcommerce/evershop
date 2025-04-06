/* eslint-disable camelcase */
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import { error } from '@evershop/evershop/src/lib/log/logger.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';

export default async (request, response, delegate, next) => {
  try {
    const { cart_id } = request.params;
    const { method_code } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          message: 'Invalid cart',
          status: INVALID_PAYLOAD
        }
      });
    } else {
      // Save payment method
      await cart.setData('shipping_method', method_code);

      // Save the cart
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          method: {
            code: method_code
          }
        }
      };
      next();
    }
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: translate('Failed to set shipping method'),
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
