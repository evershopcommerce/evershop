import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type { CustomerRow } from '../../../../types/db/index.js';

/**
 * The customer with this id if the account is active (status 1), else null.
 * Signing in and issuing tokens without a password both start here, so a
 * disabled account can never get a session or a token that way.
 */
export async function getActiveCustomer(
  customerId: number
): Promise<CustomerRow | null> {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return null;
  }
  const customer = (await select()
    .from('customer')
    .where('customer_id', '=', customerId)
    .and('status', '=', 1)
    .load(pool)) as CustomerRow | null;
  return customer ?? null;
}
