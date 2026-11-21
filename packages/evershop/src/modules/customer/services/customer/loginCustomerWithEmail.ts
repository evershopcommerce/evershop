import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { comparePassword } from '../../../../lib/util/passwordHelper.js';
import { emailPattern } from './emailPattern.js';
import { startCustomerSession } from './loginCustomer.js';
/**
 * Login a customer with email and password. This function must be accessed from the request object (request.loginCustomerWithEmail(email, password, callback))
 * @param {string} email
 * @param {string} password
 */
async function loginCustomerWithEmail(email: string, password: string) {
  // `ILIKE` with the address written literally: any letter case, no wildcard.
  const customer = await select()
    .from('customer')
    .where('email', 'ILIKE', emailPattern(email))
    .and('status', '=', 1)
    .load(pool);
  const result = comparePassword(password, customer ? customer.password : '');
  if (!customer || !result) {
    throw new Error(translate('Invalid email or password'));
  }
  // The session and a safe payload (no password), as for every sign-in
  startCustomerSession(this, customer);
}

export default loginCustomerWithEmail;
