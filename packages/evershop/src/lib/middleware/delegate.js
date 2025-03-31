export function getDelegates(request) {
  return request.locals ? request.locals.delegates || {} : {};
}

export function setDelegate(id, value, request) {
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
}
