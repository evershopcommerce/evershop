import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { comparePassword } from '../../../../lib/util/passwordHelper.js';
/**
 * Login a customer with email and password. This function must be accessed from the request object (request.loginCustomerWithEmail(email, password, callback))
 * @param {string} email
 * @param {string} password
 */
async function loginCustomerWithEmail(email, password) {
  // Escape the email to prevent SQL injection
  const customerEmail = email.replace(/%/g, '\\%');
  const customer = await select()
    .from('customer')
    .where('email', 'ILIKE', customerEmail)
    .and('status', '=', 1)
    .load(pool);
  const result = comparePassword(password, customer ? customer.password : '');
  if (!customer || !result) {
    throw new Error(translate('Invalid email or password'));
  }
  this.session.customerID = customer.customer_id;
  // Delete the password field
  delete customer.password;
  // Save the customer in the request
  this.locals.customer = customer;
}

export default loginCustomerWithEmail;
