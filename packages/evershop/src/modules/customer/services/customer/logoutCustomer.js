import { update } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

/**
 * Logout the current customer. This function must be accessed from the request object (request.logoutCustomer(callback))
 *
 * The browser session outlives the sign-out, so the customer's cart is
 * unlinked from it here: left linked, it was handed — items, billing and
 * shipping address — to whoever used the browser next. It stays the
 * customer's and comes back at their next sign-in (getMyCart). A failure to
 * unlink never blocks the sign-out; getMyCart refuses another customer's
 * cart anyway.
 */
async function logoutCustomer() {
  const customerID = this.session.customerID;
  this.session.customerID = undefined;
  this.locals.customer = undefined;
  if (customerID && this.sessionID) {
    try {
      await update('cart')
        .given({ sid: null })
        .where('sid', '=', this.sessionID)
        .and('customer_id', '=', customerID)
        .and('status', '=', 1)
        .execute(pool);
    } catch (e) {
      error(e);
    }
  }
}

export default logoutCustomer;
