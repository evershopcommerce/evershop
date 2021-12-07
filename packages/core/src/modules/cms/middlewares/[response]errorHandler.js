const logger = require("../../../lib/log/logger");

module.exports = (err, req, response, stack, next) => {
    logger.log("error", `Exception in errorHandler middleware`, { message: err.message, stack: err.stack })
    response.status(500).send(err.message);
};