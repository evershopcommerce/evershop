const { request } = require('express');
const { hookable } = require('../../lib/util/hookable');
const loginUserWithEmail = require('./services/loginUserWithEmail');
const logoutUser = require('./services/logoutUser');

module.exports = () => {
  request.loginUserWithEmail = async function login(email, password, callback) {
    await hookable(loginUserWithEmail.bind(this))(email, password);
    this.session.save(callback);
  };

  request.logoutUser = function logout(callback) {
    hookable(logoutUser.bind(this))();
    this.session.save(callback);
  };

  request.isUserLoggedIn = function isUserLoggedIn() {
    return !!this.session.userID;
  };

  request.getCurrentUser = function getCurrentUser() {
    return this.locals.user;
  };
};
