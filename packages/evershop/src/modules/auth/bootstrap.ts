import { request } from 'express';
import { EvershopRequest } from '../../types/request.js';
import { loginUserWithEmail } from './services/loginUserWithEmail.js';
import { logoutUser } from './services/logoutUser.js';

export default () => {
  (request as unknown as EvershopRequest).loginUserWithEmail =
    async function login(email, password, callback) {
      await loginUserWithEmail.bind(this)(email, password);
      if (this.session) {
        this.session.save(callback);
      }
    };

  (request as unknown as EvershopRequest).logoutUser = function logout(
    callback
  ) {
    logoutUser.bind(this)();
    if (this.session) {
      this.session.save(callback);
    }
  };

  (request as unknown as EvershopRequest).isUserLoggedIn =
    function isUserLoggedIn() {
      return !!this.session.userID;
    };

  (request as unknown as EvershopRequest).getCurrentUser =
    function getCurrentUser() {
      return this.locals.user;
    };
};
