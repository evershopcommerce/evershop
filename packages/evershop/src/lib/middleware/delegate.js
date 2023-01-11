const getDelegates = function getDelegates(request) {
  return request.locals ? request.locals.delegates || {} : {};
};

const setDelegate = function setDelegate(id, value, request) {
  if (request.locals) {
    if (request.locals.delegates) {
      request.locals.delegates[id] = value;
    } else {
      request.locals.delegates = {};
      request.locals.delegates[id] = value;
    }
  } else {
    request.locals = {};
    request.locals.delegates = {};
    request.locals.delegates[id] = value;
  }
};

module.exports.getDelegates = getDelegates;

module.exports.setDelegate = setDelegate;
