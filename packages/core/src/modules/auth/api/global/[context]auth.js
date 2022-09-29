const jwt = require('jsonwebtoken');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { getTokenCookieId } = require('../../services/getTokenCookieId');
const { getTokenSecret } = require('../../services/getTokenSecret');

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
        response.json({
          success: false,
          message: 'Failed to authenticate token.',
        });
      } else {
        setContextValue(request, 'tokenPayload', decoded);
        next();
      }
    });
  }
};
