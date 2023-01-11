const { getConfig } = require('../../../lib/util/getConfig');

module.exports.getAdminTokenCookieId = () => getConfig('jwt.adminCookieId', 'admin_token');
