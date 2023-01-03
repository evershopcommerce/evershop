const { select, insertOnUpdate } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../lib/mysql/connection');
const { compare } = require('bcrypt');
const { sign } = require('jsonwebtoken');
const { camelCase } = require('../../../../lib/util/camelCase');
const { v4: uuidv4 } = require('uuid');
const { getTokenCookieId } = require('../../../auth/services/getTokenCookieId');
const { getContextValue } = require('../../../graphql/services/contextHelper');
const { INVALID_PAYLOAD, OK } = require('../../../../lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;
  const { email, password } = body;
  const user = await select()
    .from('customer')
    .where('email', '=', email)
    .load(pool);

  if (!user) {
    response.status(INVALID_PAYLOAD);
    return response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid email or password'
      }
    });
  } else {
    const { password: hash } = user;
    const result = await compare(password, hash);

    if (!result) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid email or password'
        }
      });
    } else {
      // Get the tokenPayload
      const currentTokenPayload = getContextValue(request, 'tokenPayload');
      const JWT_SECRET = uuidv4();
      // Save the JWT_SECRET to the database
      await insertOnUpdate('user_token_secret')
        .given({
          user_id: user.uuid,
          sid: currentTokenPayload.sid,
          secret: JWT_SECRET
        })
        .execute(pool);

      delete user.password;
      const token = sign({ ...currentTokenPayload, user: { ...camelCase(user) } }, JWT_SECRET);
      // Send a response with the cookie
      response.cookie(getTokenCookieId(), token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
      });
      return response.status(OK).json({
        data: {
          token,
          sid: currentTokenPayload.sid
        }
      });
    }
  }
};
