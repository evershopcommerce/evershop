const { select } = require('@evershop/mysql-query-builder');
const jwt = require('jsonwebtoken');
const { pool } = require('../../../../lib/mysql/connection');
const { get } = require('../../../../lib/util/get');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { getAdminTokenCookieId } = require('../../services/getAdminTokenCookieId');
const { getTokenCookieId } = require('../../services/getTokenCookieId');
const { getTokenSecret } = require('../../services/getTokenSecret');

module.exports = async (request, response, stack, next) => {
  const message = 'Unauthorized';
  const cookieId = request.currentRoute.isAdmin ? getAdminTokenCookieId() : getTokenCookieId();
  // Get the jwt token from the cookies
  const token = request.cookies[cookieId];
  // If there is no token, return
  if (!token) {
    response.json({
      success: false,
      message: message
    });
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
        response.json({
          success: false,
          message: message
        });
      } else {
        setContextValue(request, 'tokenPayload', decoded);
        next();
      }
    });
  }
};
