const isErrorHandlerTriggered = require("./isErrorHandlerTriggered");

function noop() { }

function eNext(request, response, next) {
  return (error) => {
    if (!isErrorHandlerTriggered(response)) {
      error ? next(error) : next();
    } else {
      noop();
    }
  }
}

module.exports = eNext;