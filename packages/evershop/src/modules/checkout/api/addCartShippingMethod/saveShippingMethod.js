import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';
import { setShippingMethod } from '../../services/setShippingMethod.js';
import { ShippingQuoteError } from '../../services/shipping/resolveShippingQuote.js';

export default async (request, response, next) => {
  try {
    const { cart_id } = request.params;
    const { method_code, provider_code } = request.body;
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    if (!provider_code) {
      // No more silent default to 'core'. The storefront must supply
      // provider_code; missing it almost certainly means the storefront
      // dropped the field somewhere along the chain (a strip in a
      // re-map, a stale cache, a Base.tsx query without the field), and
      // defaulting hid the bug behind a downstream "method no longer
      // available" error.
      response.status(INVALID_PAYLOAD).json({
        error: {
          message: 'provider_code is required',
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    // Pre-resolve the quote and store the enriched value in one shot via the
    // dedicated service. `cart.setData('shipping_method_data', ...)` with a
    // bare intent would either drop the snapshot (breaking downstream fees)
    // or violate DataObject's "resolver returns what was set" contract.
    await setShippingMethod(cart, {
      provider_code,
      method_code
    });

    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        method: {
          code: method_code,
          provider_code
        }
      }
    };
    next();
  } catch (e) {
    error(e);
    if (e instanceof ShippingQuoteError) {
      // User-facing reason — surface 400 with the message from the helper.
      response.status(INVALID_PAYLOAD).json({
        error: { message: e.message, status: INVALID_PAYLOAD }
      });
      return;
    }
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        message: translate('Failed to set shipping method'),
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
