const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: '.log/error.log', level: 'error' }),
        new winston.transports.File({ filename: '.log/combined.log' })
    ],
});
// Call exceptions.handle with a transport to handle exceptions
logger.exceptions.handle(
    new winston.transports.File({ filename: '.log/exceptions.log' })
)


module.exports = exports = logger;