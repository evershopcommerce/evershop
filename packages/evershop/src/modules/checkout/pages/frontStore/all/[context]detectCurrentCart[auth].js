import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getCartByUUID } from '../../../services/getCartByUUID.js';
import { saveCart } from '../../../services/saveCart.js';

export default async (request, response, next) => {
  // Check if any cart is associated with the session id
  const cart = await select()
    .from('cart')
    .where('sid', '=', request.sessionID)
    .andWhere('status', '=', 1)
    .load(pool);

  if (cart) {
    const cartObject = await getCartByUUID(cart.uuid);
    // Save the cart
    await saveCart(cartObject);
    setContextValue(request, 'cartId', cart.uuid);
  } else {
    // Get the customer id from the session
    const customerID = request.session.customerID || null;
    if (customerID) {
      // Check if any cart is associated with the customer id
      const customerCart = await select()
        .from('cart')
        .where('customer_id', '=', customerID)
        .andWhere('status', '=', 1)
        .load(pool);

      if (customerCart) {
        // Update the cart with the session id
        await update('cart')
          .given({ sid: request.sessionID })
          .where('uuid', '=', customerCart.uuid)
          .execute(pool);
        request.session.cartID = customerCart.uuid;
        setContextValue(request, 'cartId', customerCart.uuid);
      } else {
        setContextValue(request, 'cartId', undefined);
      }
    }
  }
  next();
};
