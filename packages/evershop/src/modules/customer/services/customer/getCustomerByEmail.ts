import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type { CustomerRow } from '../../../../types/db/index.js';
import { emailPattern } from './emailPattern.js';

/**
 * The customer with this email address, in any letter case and with any
 * status, without the password hash; null when there is none. Core treats
 * Jane@x.com and jane@x.com as one account (sign-up refuses the second, login
 * accepts either), so an extension that looks a customer up by email, such as
 * a social login, should use this rather than `where('email', '=', ...)`.
 * Columns an extension added to `customer` are included.
 */
export async function getCustomerByEmail(
  email: string
): Promise<Omit<CustomerRow, 'password'> | null> {
  if (typeof email !== 'string' || email === '') {
    return null;
  }
  // `ILIKE` with the address written literally: any letter case, no wildcard
  const customer = (await select()
    .from('customer')
    .where('email', 'ILIKE', emailPattern(email))
    .load(pool)) as CustomerRow | null;
  if (!customer) {
    return null;
  }
  const { password, ...withoutPassword } = customer;
  return withoutPassword;
}
