const { request } = require('express');
const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('../../lib/postgres/connection');
const { comparePassword } = require('../../lib/util/passwordHelper');

module.exports = () => {
  request.loginUserWithEmail = async function loginUserWithEmail(
    email,
    password,
    callback
  ) {
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

    this.session.save(callback);
  };

  request.logoutUser = function logoutUser(callback) {
    this.session.userID = undefined;
    this.locals.user = undefined;

    this.session.save(callback);
  };

  request.isUserLoggedIn = function isUserLoggedIn() {
    return !!this.session.userID;
  };

  request.getCurrentUser = function getCurrentUser() {
    return this.locals.user;
  };
};
