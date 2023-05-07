const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.getTokenCookieId = () => getConfig('jwt.cookieId', 'token');
