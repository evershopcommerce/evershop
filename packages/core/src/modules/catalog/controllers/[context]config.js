const config = require('config');

module.exports = (request, response) => {
  /** Add some config to context value */
  response.context.currency = config.get('shop.currency');
  response.context.language = config.get('shop.language');
  response.context.timezone = config.get('shop.timezone');
};
