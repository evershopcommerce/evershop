const config = require("config");

module.exports = (request, response, stack) => {
    /** Add some config to context value */
    response.context.currency = config.get("shop.currency");
    response.context.language = config.get("shop.language");
}