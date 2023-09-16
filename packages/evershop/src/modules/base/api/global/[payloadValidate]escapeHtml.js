const escapePayload = require('../../services/escapePayload');

module.exports = (request, response, delegate, next) => {
  // return next();
  if (request.method === 'GET') {
    next();
  } else {
    // Escape the characters <, > from the payload
    escapePayload(request.body);
    next();
  }
};
