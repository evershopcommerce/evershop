const logger = require('@evershop/evershop/src/lib/log/logger');
const { setDelegate } = require('./delegate');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.syncMiddlewareWrapper = function syncMiddlewareWrapper(
  id,
  middlewareFunc,
  request,
  response,
  delegates,
  next
) {
  const startTime = process.hrtime();
  try {
    let delegate;
    const debuging = {
      id
    };
    response.debugMiddlewares.push(debuging);
    // If the middleware function has the next function as a parameter
    if (middlewareFunc.length === 4) {
      delegate = middlewareFunc(request, response, delegates, (error) => {
        const endTime = process.hrtime(startTime);
        debuging.time = endTime[1] / 1000000;
        next(error);
      });
    } else {
      delegate = middlewareFunc(request, response, delegates);
      const endTime = process.hrtime(startTime);
      debuging.time = endTime[1] / 1000000;
    }
    setDelegate(id, delegate, request);
  } catch (e) {
    // Log the error
    logger.error(`Exception in middleware ${id}`);
    logger.error(e);

    // Call error handler middleware if it is not called yet
    next(e);
  }
};
