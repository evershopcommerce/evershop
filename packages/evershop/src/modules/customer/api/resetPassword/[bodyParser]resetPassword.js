const { insert, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const crypto = require('crypto');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;
  // eslint-disable-next-line camelcase
  const { email } = body;
  try {
    // Generate a random token using crypto module
    const token = crypto.randomBytes(64).toString('hex');

    // Hash the token
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if email is existed
    const existingCustomer = await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool);

    if (existingCustomer) {
      // Insert token to reset_password_token table
      await insert('reset_password_token')
        .given({
          customer_id: existingCustomer.customer_id,
          token: hash
        })
        .execute(pool);
    }

    response.status(OK);
    response.$body = {
      token,
      email
    };

    // The email will be taken care by the email extension. SendGrid for example
    // An extension can add a middleware to this route to send email
    next();
  } catch (e) {
    debug('critical', e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
