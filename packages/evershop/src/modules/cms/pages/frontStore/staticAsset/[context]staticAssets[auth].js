const staticMiddleware = require('@evershop/evershop/src/lib/middlewares/static');

module.exports = (request, response, delegate, next) => {
  staticMiddleware(request, response, next);
};
