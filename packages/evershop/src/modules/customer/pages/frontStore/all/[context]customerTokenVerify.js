const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { select } = require('@evershop/mysql-query-builder');
const { setContextValue } = require('../../../../graphql/services/contextHelper');
const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { pool } = require('../../../../../lib/mysql/connection');
const { getTokenSecret } = require('../../../../auth/services/getTokenSecret');
const { generateToken } = require('../../../../auth/services/generateToken');
const { getTokenCookieId } = require('../../../../auth/services/getTokenCookieId');

module.exports = async (request, response, delegate, next) => {
  const cookieId = getTokenCookieId();
  // Get the jwt token from the cookies
  const token = request.cookies[cookieId];
  const sid = uuidv4();
  const guestPayload = { customer: null, sid };
  // If there is no token, generate a new one for guest user
  if (!token) {
    // Issue a new token for guest user
    const newToken = generateToken(guestPayload, getTokenSecret());
    // Set the new token in the cookies
    response.cookie(cookieId, newToken, { maxAge: 1.728e+8, httpOnly: true });
    setContextValue(request, 'customerTokenPayload', guestPayload);
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
      .and('user_id', '=', get(tokenPayload, 'payload.customer.uuid', null))
      .load(pool);

    if (!check) { // This is guest user
      secret = getTokenSecret();
    } else {
      secret = check.secret;
    }

    // Verify the token
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        // Issue a new token for guest user
        const newToken = generateToken(guestPayload, getTokenSecret());
        setContextValue(request, 'customerTokenPayload', guestPayload);
        setContextValue(request, 'sid', sid);
        // Set the new token in the cookies
        response.cookie(cookieId, newToken, { maxAge: 1.728e+8, httpOnly: true });
        // Redirect to home page
        response.redirect(
          buildUrl('homepage')
        );
      } else {
        setContextValue(request, 'customerTokenPayload', decoded);
        setContextValue(request, 'sid', decoded.sid);
        next();
      }
    });
  }
};
