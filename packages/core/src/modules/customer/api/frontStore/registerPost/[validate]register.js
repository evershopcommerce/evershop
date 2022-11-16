const { insert, insertOnUpdate, select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { v4: uuidv4 } = require('uuid');
const { getTokenCookieId } = require('../../../../auth/services/getTokenCookieId');
const { sign } = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { camelCase } = require('../../../../../lib/util/camelCase');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { body } = request;
  const { email, full_name, password } = body;
  try {
    // Hash the password
    const hash = await bcrypt.hash(password, 10);
    await insert('customer')
      .given({
        email,
        full_name,
        password: hash
      })
      .execute(pool);

    // Load the customer
    const customer = await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool);

    // Create a token
    // Send a response with the cookie
    const JWT_SECRET = uuidv4();
    // Save the JWT_SECRET to the database
    await insertOnUpdate('user_token_secret')
      .given({
        user_id: customer.uuid,
        secret: JWT_SECRET
      })
      .execute(pool);

    delete customer.password;

    // Get the tokenPayload
    const currentTokenPayload = getContextValue(request, 'tokenPayload');
    const token = sign({ ...currentTokenPayload, user: { ...camelCase(customer) } }, JWT_SECRET, { expiresIn: '2d' });
    // Send a response with the cookie
    response.cookie(getTokenCookieId(), token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    });

    response.status(200).json({
      success: true,
      message: 'Customer created'
    });
  } catch (e) {
    response.status(400).json({
      success: false,
      message: e.message // Todo: Improve error message for debugging
    });
  }
};
