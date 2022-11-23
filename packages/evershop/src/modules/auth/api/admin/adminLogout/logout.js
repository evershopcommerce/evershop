const { del } = require('@evershop/mysql-query-builder');
const jwt = require('jsonwebtoken');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getAdminTokenCookieId } = require('../../../services/getAdminTokenCookieId');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  // Get the jwt token from the cookies
  const token = request.cookies[getAdminTokenCookieId()];
  // Get user from token
  const tokenPayload = jwt.decode(token, { complete: true, json: true });

  // Check if user is in the token
  if (!tokenPayload.payload?.user) {
    // Check if the http method is GET
    if (request.method === 'GET') {
      // Redirect to login page
      response.redirect(buildUrl('adminLogin'));
    } else {
      return response.status(200).json({
        success: true
      });
    }
  } else {
    // Delete the secret from the database
    await del('user_token_secret')
      .where('user_id', '=', tokenPayload.payload.user?.uuid)
      .execute(pool);

    // Check if the http method is GET
    if (request.method === 'GET') {
      // Redirect to login page
      response.redirect(buildUrl('adminLogin'));
    } else {
      return response.status(200).json({
        success: true
      });
    }
  }
};
