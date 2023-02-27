const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.getAdminTokenCookieId = () =>
  getConfig('jwt.adminCookieId', 'admin_token');
