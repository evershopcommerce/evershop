const jwt = require('jsonwebtoken');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { v4: uuidv4 } = require('uuid');
const { getTokenCookieId } = require('../../services/getTokenCookieId');
const { getTokenSecret } = require('../../services/getTokenSecret');
const { generateWebToken } = require('../../services/generateToken');

module.exports = (request, response, stack, next) => {
  // Get the jwt token from the cookies
  const token = request.cookies[getTokenCookieId()];
  // If there is no token, return
  if (!token) {
    next();
  } else {
    // Verify the token
    jwt.verify(token, getTokenSecret(), (err, decoded) => {
      if (err) {
        // Issue a new token for guest user
        const newToken = generateWebToken({ customerId: 0, sid: uuidv4() });
        // Set the new token in the cookies
        response.cookie(getTokenCookieId(), newToken, { maxAge: 172800000, httpOnly: true });
        next();
      } else {
        setContextValue(request, 'tokenPayload', decoded);
        next();
      }
    });
  }
};
