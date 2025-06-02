import { request } from 'express';
import { hookable } from '../../lib/util/hookable.js';
import loginUserWithEmail from './services/loginUserWithEmail.js';
import logoutUser from './services/logoutUser.js';

export default () => {
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
