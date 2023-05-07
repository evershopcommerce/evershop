const { select } = require('@evershop/postgres-query-builder');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { get } = require('@evershop/evershop/src/lib/util/get');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { generateToken } = require('../../services/generateToken');
const {
  getAdminTokenCookieId
} = require('../../services/getAdminTokenCookieId');
const { getTokenSecret } = require('../../services/getTokenSecret');

module.exports = async (request, response, delegate, next) => {
  const message = 'Unauthorized';
  // Get the jwt token from the cookies
  const cookieId = getAdminTokenCookieId();
  const token = request.cookies[cookieId];
  // If there is no token, generate a new one for guest user
  if (!token) {
    // Issue a new token for guest user
    const payload = { user: null, sid: uuidv4() };
    const newToken = generateToken(payload, getTokenSecret());
    // Set the new token in the cookies
    response.cookie(cookieId, newToken, { maxAge: 1.728e8, httpOnly: true });
    setContextValue(request, 'userTokenPayload', payload);
    setContextValue(request, 'user', null);
    // Continue to the next middleware
    next();
  } else {
    // Get user from token
    const tokenPayload = jwt.decode(token, { complete: true, json: true });
    let secret;
    // Get the secret from database
    const check = await select()
      .from('user_token_secret')
      .where('user_id', '=', get(tokenPayload, 'payload.user.uuid', null))
      .and('sid', '=', get(tokenPayload, 'payload.sid', null))
      .load(pool);

    if (!check) {
      // This is guest user
      secret = getTokenSecret();
    } else {
      secret = check.secret;
    }

    // Verify the token
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        response.status(UNAUTHORIZED).json({
          error: {
            message,
            status: UNAUTHORIZED
          }
        });
      } else {
        setContextValue(request, 'userTokenPayload', decoded);
        // TODO: Get user roles from database
        setContextValue(request, 'user', { ...decoded.user, roles: '*' });
        next();
      }
    });
  }
};
