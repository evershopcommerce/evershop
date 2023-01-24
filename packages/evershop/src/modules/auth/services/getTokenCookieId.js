const { getConfig } = require('../../../lib/util/getConfig');

module.exports.getTokenCookieId = () => getConfig('jwt.cookieId', 'token');
