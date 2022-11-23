const { getConfig } = require("../../../lib/util/getConfig")

module.exports.getTokenCookieId = () => {
  return getConfig("jwt.cookieId", "token");
}