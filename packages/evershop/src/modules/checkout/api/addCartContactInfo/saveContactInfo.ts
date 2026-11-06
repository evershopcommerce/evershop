import { validate as isUuid } from 'uuid';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * Saves the shopper's email on an active cart. The checkout sends it as soon
 * as a guest enters it; the payload schema has checked it is an email.
 *
 * One column, in one statement, and only while the cart is active. Loading
 * the cart and saving it back (`saveCart`) writes every column, `status`
 * included (its resolver always gives 1), so a save that loaded the cart just
 * before the order was placed and wrote just after made the ordered cart
 * active again. The checkout sends this request when the shopper leaves the
 * email field, so clicking "Place order" from there starts it just before the
 * order.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: () => void
) => {
  try {
    const cartId = request.params.cart_id;
    const { email } = request.body;
    // `cart.uuid` is a UUID column: anything else would fail in Postgres
    const { rows } = isUuid(cartId)
      ? await pool.query(
          `UPDATE "cart" SET "customer_email" = $1
          WHERE "uuid" = $2 AND "status" = TRUE
          RETURNING "customer_email"`,
          [email, cartId]
        )
      : { rows: [] };
    if (rows.length === 0) {
      // No such cart, or its order was placed
      response.status(NOT_FOUND).json({
        error: {
          message: translate('Invalid cart'),
          status: NOT_FOUND
        }
      });
      return;
    }
    response.status(OK);
    response.$body = {
      data: {
        email: rows[0].customer_email
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
