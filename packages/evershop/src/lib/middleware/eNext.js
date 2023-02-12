const isErrorHandlerTriggered = require('./isErrorHandlerTriggered');

function noop() {}

function eNext(request, response, next) {
  return (error) => {
    if (!isErrorHandlerTriggered(response)) {
      // eslint-disable-next-line no-unused-expressions
      error ? next(error) : next();
    } else {
      noop();
    }
  };
}

module.exports = eNext;
