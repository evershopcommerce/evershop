const { select, insertOnUpdate } = require('@evershop/postgres-query-builder');
const { compareSync } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getTokenCookieId } = require('../../../auth/services/getTokenCookieId');
const {
  getContextValue,
  setContextValue
} = require('../../../graphql/services/contextHelper');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;
  const { email, password } = body;
  const customer = await select()
    .from('customer')
    .where('email', '=', email)
    .and('status', '=', 1)
    .load(pool);

  if (!customer) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid email or password'
      }
    });
  } else {
    const { password: hash } = customer;
    const result = compareSync(password, hash);

    if (!result) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid email or password'
        }
      });
    } else {
      // Get the tokenPayload
      const currentTokenPayload = getContextValue(
        request,
        'customerTokenPayload'
      );
      const JWT_SECRET = uuidv4();
      // Save the JWT_SECRET to the database
      await insertOnUpdate('user_token_secret', ['sid'])
        .given({
          user_id: customer.uuid,
          sid: currentTokenPayload.sid,
          secret: JWT_SECRET
        })
        .execute(pool);

      delete customer.password;
      const newPayload = {
        ...currentTokenPayload,
        customer: { ...camelCase(customer) }
      };
      const token = sign(newPayload, JWT_SECRET);
      setContextValue(request, 'customerTokenPayload', newPayload);
      // Send a response with the cookie
      response.cookie(getTokenCookieId(), token, {
        httpOnly: true,
        maxAge: 1.728e8
      });
      response.status(OK);
      response.$body = {
        data: {
          token,
          sid: currentTokenPayload.sid
        }
      };
      next();
    }
  }
};
