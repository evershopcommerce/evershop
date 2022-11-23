const { getConfig } = require("../../../lib/util/getConfig");

module.exports.getTokenLifeTime = () => {
  return getConfig('jwt.web_token_life_time', '2d');
}