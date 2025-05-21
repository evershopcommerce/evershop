import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default async (request, response) => {
  // When the user cancelled the payment from PayPal
  // he/she will be redirected to the checkout page.
  // We need to check if the cart is still valid.
  // Get the paypal token from query string
  const paypalToken = request.query.token;

  const { order_id } = request.params;
  if (paypalToken) {
    // This token actually the paypal order id
    const order = await select()
      .from('order')
      .where('integration_order_id', '=', paypalToken)
      .and('uuid', '=', order_id)
      .and('payment_method', '=', 'paypal')
      .and('payment_status', '=', 'pending')
      .load(pool);
    if (order) {
      // We re-activate the cart
      await update('cart')
        .given({ status: 1 })
        .where('cart_id', '=', order.cart_id)
        .execute(pool);
    }
  }
  // Redirect to the checkout page
  response.redirect(302, buildUrl('checkout'));
};
