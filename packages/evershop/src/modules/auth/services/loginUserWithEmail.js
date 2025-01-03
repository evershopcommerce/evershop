const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  comparePassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');
const { select } = require('@evershop/postgres-query-builder');

/**
 * This function will login the admin user with email and password. This function must be accessed from the request object (request.loginUserWithEmail(email, password, callback))
 * @param {string} email
 * @param {string} password
 */
async function loginUserWithEmail(email, password) {
  // Escape the email to prevent SQL injection
  const userEmail = email.replace(/%/g, '\\%');
  const user = await select()
    .from('admin_user')
    .where('email', 'ILIKE', userEmail)
    .and('status', '=', 1)
    .load(pool);
  const result = comparePassword(password, user ? user.password : '');
  if (!user || !result) {
    throw new Error('Invalid email or password');
  }
  this.session.userID = user.admin_user_id;
  // Delete the password field
  delete user.password;
  // Save the user in the request
  this.locals.user = user;
}

module.exports = loginUserWithEmail;
