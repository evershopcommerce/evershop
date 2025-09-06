import { translate } from '../../../../lib/locale/translate/translate.js';
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
    const { sessionID, customer } = request.locals;
    const myCart = await getMyCart(sessionID || ' ', customer?.customer_id);
    const { item_id } = request.params;
    if (!myCart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    const item = await myCart.removeItem(item_id, {});
    await saveCart(myCart);
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
