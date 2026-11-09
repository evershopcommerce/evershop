import { select, update } from '@evershop/postgres-query-builder';
import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../../types/request.js';
import {
  belongsToAnotherCustomer,
  releaseCartFromSession
} from '../../../services/cartSession.js';

export default async (request: EvershopRequest, response, next) => {
  try {
    const { sessionID } = request;
    const customer = request.getCurrentCustomer();
    if (customer) {
      // Check if there is any cart with the same sid
      const cart = await select()
        .from('cart')
        .where('sid', '=', sessionID)
        .and('status', '=', 1)
        .load(pool);
      if (cart && belongsToAnotherCustomer(cart, customer.customer_id)) {
        // Another customer's cart, left on this browser's session when they
        // signed out. Claiming it handed their items and their address to
        // whoever signed in next. Unlink it instead — it stays theirs.
        await releaseCartFromSession(cart.cart_id);
      } else if (cart) {
        // A guest cart (or already this customer's): the customer takes it.
        await update('cart')
          .given({
            customer_group_id: customer.group_id,
            customer_id: customer.customer_id,
            customer_full_name: customer.full_name,
            customer_email: customer.email
          })
          .where('cart_id', '=', cart.cart_id)
          .execute(pool);
      }
    }
  } catch (e) {
    error(e);
  }
  next();
};
