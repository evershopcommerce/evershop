const { getConfig } = require('../../../lib/util/getConfig');

module.exports.getTokenSecret = () =>
  getConfig('jwt.web_token_secret', 'secret');
