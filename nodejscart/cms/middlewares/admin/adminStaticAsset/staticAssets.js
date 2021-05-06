const staticMiddleware = require("../../../../../lib/middlewares/static");

module.exports = function (request, response, stack, next) {
    staticMiddleware(request, response, next);
}