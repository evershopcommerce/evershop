const { getConfig } = require("../../../lib/util/getConfig")

module.exports.getAdminTokenCookieId = () => {
  return getConfig("jwt.adminCookieId", "admin_token");
}