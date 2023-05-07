const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { select } = require('@evershop/postgres-query-builder');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const { getTokenSecret } = require('../../../services/getTokenSecret');
const { generateToken } = require('../../../services/generateToken');
const { get } = require('@evershop/evershop/src/lib/util/get');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  getAdminTokenCookieId
} = require('../../../services/getAdminTokenCookieId');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

module.exports = async (request, response, delegate, next) => {
  const cookieId = getAdminTokenCookieId();
  // Get the jwt token from the cookies
  const token = request.cookies[cookieId];
  const sid = uuidv4();
  const guestPayload = { user: null, sid };
  // If there is no token, generate a new one for guest user
  if (!token) {
    // Issue a new token for guest user
    const newToken = generateToken(guestPayload, getTokenSecret());
    // Set the new token in the cookies
    response.cookie(cookieId, newToken, { maxAge: 1.728e8, httpOnly: true });
    setContextValue(request, 'userTokenPayload', guestPayload);
    setContextValue(request, 'sid', sid);
    // Continue to the next middleware
    next();
  } else {
    // Get user from token
    const tokenPayload = jwt.decode(token, { complete: true, json: true });
    let secret;
    // Get the secret from database
    const check = await select()
      .from('user_token_secret')
      .where('sid', '=', get(tokenPayload, 'payload.sid', null))
      .and('user_id', '=', get(tokenPayload, 'payload.user.uuid', null))
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
        // Issue a new token for guest user
        const newToken = generateToken(guestPayload, getTokenSecret());
        setContextValue(request, 'userTokenPayload', guestPayload);
        setContextValue(request, 'sid', sid);
        // Set the new token in the cookies
        response.cookie(cookieId, newToken, {
          maxAge: 1.728e8,
          httpOnly: true
        });
        // Redirect to home page
        response.redirect(buildUrl('adminLogin'));
      } else {
        setContextValue(request, 'userTokenPayload', decoded);
        setContextValue(request, 'user', { ...decoded.user, roles: '*' });
        setContextValue(request, 'sid', decoded.sid);
        next();
      }
    });
  }
};
