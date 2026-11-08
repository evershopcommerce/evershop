import { pool } from '../../../lib/postgres/connection.js';
import cancelOrder from './cancelOrder.js';

/**
 * For a payment method whose shopper left without paying (a closed PayPal
 * window, a 3-D Secure check never finished): cancels the order, then gives
 * its cart back, so the shopper's cart recovery link (C3) works again and an
 * abandoned-cart email can bring them back.
 *
 * Core closes a cart when the order is created, before the payment, and
 * cannot tell from "pending" whether a shopper gave up or a payment is still
 * on its way (a bank debit can stay pending for days): only the payment
 * method can. So this is the payment method's call, made once it knows the
 * payment will never come (PayPal and Stripe call it from their abandoned
 * order jobs). Never call it for an order whose money may still arrive.
 *
 * The cart is reopened only when no order made from it was ever placed
 * (`placed_at`) and every one is canceled: a cart that led to a sale, or
 * still has an order in progress, stays closed. It comes back unlinked from
 * the old browser session (`sid` NULL), so it never competes with a cart the
 * shopper started since; the recovery link, or the customer's next sign-in
 * (`getMyCart` by customer), finds it. `cancelOrder` emits `order_canceled`
 * as usual; it throws when the order cannot be canceled, and then the cart
 * stays closed.
 */
export async function cancelAbandonedOrder(
  orderUuid: string,
  reason: string
): Promise<{ cartReopened: boolean }> {
  await cancelOrder(orderUuid, reason);
  const result = await pool.query(
    `UPDATE cart c
        SET status = TRUE, sid = NULL, updated_at = NOW()
       FROM "order" o
      WHERE o.uuid = $1
        AND c.cart_id = o.cart_id
        AND c.status = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM "order" x
           WHERE x.cart_id = c.cart_id
             AND (x.status <> 'canceled' OR x.placed_at IS NOT NULL)
        )`,
    [orderUuid]
  );
  return { cartReopened: (result.rowCount ?? 0) > 0 };
}
