const {
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');

// eslint-disable-next-line no-unused-vars
module.exports = async (err, request, response, delegate, next) => {
  debug('critical', err);
  // Set this flag to make sure this middleware only be executed 1 time
  response.locals.errorHandlerTriggered = true;
  const promises = [];
  Object.keys(delegate).forEach((id) => {
    // Check if middleware is async
    if (delegate[id] instanceof Promise) {
      promises.push(delegate[id]);
    }
  });

  // Wait for all executing async middleware to be settled before sending response
  await Promise.allSettled(promises);
  // Check if the header is already sent or not.
  if (response.headersSent) {
    // TODO: Write a log message or next(error)?.
  } else {
    let status = INTERNAL_SERVER_ERROR;
    if (!response.statusCode || response.statusCode === 200) {
      response.status(status);
    } else {
      status = response.statusCode;
    }
    response.json({
      error: {
        status,
        message: err.message
      }
    });
  }
};
