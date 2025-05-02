import { error } from '../../lib/log/logger.js';
import { setDelegate } from './delegate.js';

export function syncMiddlewareWrapper(
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
      delegate = middlewareFunc(request, response, delegates, (err) => {
        const endTime = process.hrtime(startTime);
        debuging.time = endTime[1] / 1000000;
        next(err);
      });
    } else {
      delegate = middlewareFunc(request, response, delegates);
      const endTime = process.hrtime(startTime);
      debuging.time = endTime[1] / 1000000;
    }
    setDelegate(id, delegate, request);
  } catch (e) {
    // Log the error
    e.message = `Exception in middleware ${id}: ${e.message}`;
    error(e);
    // Call error handler middleware if it is not called yet
    next(e);
  }
}
