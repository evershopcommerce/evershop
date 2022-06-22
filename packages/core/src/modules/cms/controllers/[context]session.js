const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { CONSTANTS } = require('../../../lib/helpers');

module.exports = (request, response, stack, next) => {
  const config = {
    name: 'shop',
    resave: false,
    saveUninitialized: true,
    secret: 'somesecret',
    store: new FileStore({ path: `${CONSTANTS.ROOTPATH}/.evershop/sessions` }),
    cookie: { secure: false, httpOnly: false }
  }
  if (request.isAdmin === true) {
    config.name = 'adminID';
  }
  session(config)(request, response, next);
};
