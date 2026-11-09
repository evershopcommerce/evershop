import type { CustomerRow } from '../../../../types/db/index.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { buildCustomerPayload } from './buildCustomerPayload.js';
import { getActiveCustomer } from './getActiveCustomer.js';

/**
 * What every customer sign-in leaves on the request: the customer id in the
 * session (each later request reloads the customer from it, active accounts
 * only) and the safe payload, never the password, in `locals.customer`.
 */
export function startCustomerSession(
  request: EvershopRequest,
  customer: CustomerRow
): void {
  if (request.session) {
    (request.session as unknown as Record<string, unknown>).customerID =
      customer.customer_id;
  }
  request.locals.customer = buildCustomerPayload(customer);
}

/**
 * Sign in a customer without a password: for an extension that has already
 * confirmed who the customer is some other way, such as a social login
 * (Google, GitHub) once the provider has returned a verified email. Call it on
 * the request, `await request.loginCustomer(customerId, callback)`, like
 * `request.loginCustomerWithEmail`. Only an active account (status 1) signs
 * in; anything else throws and leaves the session as it was.
 */
async function loginCustomer(
  this: EvershopRequest,
  customerId: number
): Promise<void> {
  const customer = await getActiveCustomer(customerId);
  if (!customer) {
    throw new Error('The customer does not exist or is disabled');
  }
  startCustomerSession(this, customer);
}

export default loginCustomer;
