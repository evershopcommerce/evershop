import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { comparePassword } from '@evershop/evershop/src/lib/util/passwordHelper.js';
import { select } from '@evershop/postgres-query-builder';
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
