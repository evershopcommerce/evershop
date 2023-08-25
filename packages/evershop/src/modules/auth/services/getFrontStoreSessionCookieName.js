const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.getFrontStoreSessionCookieName = () =>
  getConfig('system.session.cookieName', 'sid');
