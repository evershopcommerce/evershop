const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.getCookieSecret = () => {
  return getConfig('system.session.cookieSecret', 'keyboard cat');
};
