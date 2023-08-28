const { Handler } = require('./Handler');
const { findDublicatedMiddleware } = require('./findDublicatedMiddleware');

module.exports.addMiddleware = function addMiddleware(middleware) {
  const index = findDublicatedMiddleware(Handler.middlewares, middleware);
  if (index === -1) {
    Handler.addMiddleware(middleware);
  } else {
    const addedMiddleware = Handler.middlewares[index];
    throw new Error(
      `Found two middleware with the same id: ${middleware.path} and ${addedMiddleware.path}`
    );
  }
};
