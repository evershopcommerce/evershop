const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { CONSTANTS } = require('../../../../../lib/helpers');

module.exports = (request, response, stack, next) => {
  session({
    name: 'adminID',
    resave: false,
    saveUninitialized: true,
    secret: 'somesecret',
    store: new FileStore({ path: `${CONSTANTS.ROOTPATH}/.nodejscart/sessions` }),
    cookie: { secure: false, httpOnly: false, sameSite: true }
  })(request, response, next);
};
