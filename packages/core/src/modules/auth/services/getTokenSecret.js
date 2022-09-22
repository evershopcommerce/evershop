const { getConfig } = require("../../../lib/util/getConfig");

module.exports.getTokenSecret = () => {
  return getConfig("jwt.web_token_secret", "secret");
}