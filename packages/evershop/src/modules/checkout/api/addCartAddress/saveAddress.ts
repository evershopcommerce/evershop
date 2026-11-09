import { translate } from '../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { respondAddressValidationError } from '../../../customer/services/customer/address/addressValidationResponse.js';
import { addBillingAddress } from '../../services/addBillingAddress.js';
import { addShippingAddress } from '../../services/addShippingAddress.js';
import { findCartByUUID } from '../../services/getCartByUUID.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { address, type } = request.body;
    // Check if cart exists
    const cart = await findCartByUUID(cart_id);
    if (!cart) {
      response.status(NOT_FOUND);
      return response.json({
        error: {
          status: NOT_FOUND,
          message: translate('Invalid cart')
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
    if (respondAddressValidationError(response, e)) {
      return undefined;
    }
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
