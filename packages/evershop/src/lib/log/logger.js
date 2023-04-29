const winston = require('winston');
const path = require('path');
const { CONSTANTS } = require('../helpers');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({
      filename: path.resolve(CONSTANTS.ROOTPATH, '.log/error.log'),
      level: 'error'
    })
  ]
});
// Call exceptions.handle with a transport to handle exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.resolve(CONSTANTS.ROOTPATH, '.log/exceptions.log')
  })
);

// eslint-disable-next-line no-multi-assign
module.exports = exports = logger;
