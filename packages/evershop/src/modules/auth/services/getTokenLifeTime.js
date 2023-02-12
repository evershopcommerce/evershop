const { getConfig } = require('../../../lib/util/getConfig');

module.exports.getTokenLifeTime = () =>
  getConfig('jwt.web_token_life_time', '2d');
