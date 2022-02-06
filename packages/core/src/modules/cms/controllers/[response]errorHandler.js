const logger = require('../../../lib/log/logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, request, response, stack, next) => {
  logger.log('error', 'Exception in errorHandler middleware', { message: err.message, stack: err.stack });
  response.status(500).send(err.message);
};
