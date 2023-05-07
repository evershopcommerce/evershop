const { select, insert } = require('@evershop/postgres-query-builder');
const { compareSync } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getAdminTokenCookieId
} = require('../../services/getAdminTokenCookieId');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;
  const { email, password } = body;
  const user = await select()
    .from('admin_user')
    .where('email', '=', email)
    .load(pool);

  if (!user) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        message: 'Invalid email or password',
        status: INVALID_PAYLOAD
      }
    });
  } else {
    const { password: hash } = user;
    const result = compareSync(password, hash);

    if (!result) {
      return response.status(INVALID_PAYLOAD).json({
        error: {
          message: 'Invalid email or password',
          status: INVALID_PAYLOAD
        }
      });
    } else {
      const JWT_SECRET = uuidv4();
      const sid = uuidv4();
      // Save the JWT_SECRET to the database
      await insert('user_token_secret')
        .given({
          user_id: user.uuid,
          sid,
          secret: JWT_SECRET
        })
        .execute(pool);

      delete user.password;
      const token = sign(
        {
          user: {
            ...camelCase(user),
            isAdmin: true
          },
          sid
        },
        JWT_SECRET,
        {
          expiresIn: '1d'
        }
      );
      // Send a response with the cookie
      response.cookie(getAdminTokenCookieId(), token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
      });

      return response.status(OK).json({
        data: {
          token,
          sid
        }
      });
    }
  }
};
