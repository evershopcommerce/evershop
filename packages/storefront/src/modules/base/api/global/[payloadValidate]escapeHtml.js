import escapePayload from '../../services/escapePayload.js';

export default (request, response, next) => {
  // return next();
  if (request.method === 'GET') {
    next();
  } else {
    // Escape the characters <, > from the payload
    escapePayload(request.body);
    next();
  }
};
