const jwt = require('jsonwebtoken');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { v4: uuidv4 } = require('uuid');
const { getTokenCookieId } = require('../../services/getTokenCookieId');
const { getTokenSecret } = require('../../services/getTokenSecret');
const { generateToken } = require('../../services/generateToken');
const { get } = require('../../../../lib/util/get');
const { buildUrl } = require('../../../../lib/router/buildUrl');
const { getAdminTokenCookieId } = require('../../services/getAdminTokenCookieId');
const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
  const cookieId = request.currentRoute.isAdmin ? getAdminTokenCookieId() : getTokenCookieId();
  // Get the jwt token from the cookies
  const token = request.cookies[cookieId];
  // If there is no token, generate a new one for guest user
  if (!token) {
    // Issue a new token for guest user
    const payload = { user: null, sid: uuidv4() };
    const newToken = generateToken(payload);
    // Set the new token in the cookies
    response.cookie(cookieId, newToken, { maxAge: 172800000, httpOnly: true });
    setContextValue(request, 'tokenPayload', payload);
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
      .load(pool);

    if (!check) { // This is guest user
      secret = getTokenSecret();
    } else {
      secret = check.secret;
    }

    // Verify the token
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        const payload = { user: null, sid: uuidv4() };
        // Issue a new token for guest user
        const newToken = generateToken(payload);
        setContextValue(request, 'tokenPayload', decoded);
        // Set the new token in the cookies
        response.cookie(cookieId, newToken, { maxAge: 172800000, httpOnly: true });
        // Redirect to home page
        response.redirect(buildUrl('homepage'));
      } else {
        setContextValue(request, 'tokenPayload', decoded);
        next();
      }
    });
  }
};
