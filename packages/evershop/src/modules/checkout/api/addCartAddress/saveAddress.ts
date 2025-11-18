import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { addBillingAddress } from '../../services/addBillingAddress.js';
import { addShippingAddress } from '../../services/addShippingAddress.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { address, type } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid cart'
        }
      });
    }
    let addedAddress;
    if (type === 'shipping') {
      addedAddress = await addShippingAddress(cart.getData('uuid'), address, {
        cart
      });
    } else {
      addedAddress = await addBillingAddress(cart.getData('uuid'), address, {
        cart
      });
    }

    response.status(OK);
    return response.json({
      data: addedAddress
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
