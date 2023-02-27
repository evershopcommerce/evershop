/* eslint-disable global-require */
/* eslint-disable guard-for-in */
/* eslint-disable import/no-import-module-exports */
const isErrorHandlerTriggered = require('@evershop/evershop/src/lib/middleware/isErrorHandlerTriggered');

module.exports = async (request, response, delegate, next) => {
  /** Get all promise delegate */
  const promises = [];
  Object.keys(delegate).forEach((id) => {
    // Check if middleware is async
    if (delegate[id] instanceof Promise) {
      promises.push(delegate[id]);
    }
  });

  try {
    /** Wait for all async middleware to be completed */
    await Promise.all(promises);

    /** If a rejected middleware called next(error) without throwing an error */
    if (isErrorHandlerTriggered(response)) {
      return;
    } else {
      response.json(response.$body || {});
    }
  } catch (error) {
    if (!isErrorHandlerTriggered(response)) {
      next(error);
    } else {
      // Do nothing here since the next(error) is already called
      // when the error is thrown on each middleware
    }
  }
};
