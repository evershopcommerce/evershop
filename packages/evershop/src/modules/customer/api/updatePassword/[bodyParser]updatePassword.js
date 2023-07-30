const { update, select, del } = require('@evershop/postgres-query-builder');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;

  try {
    // Generate a random token using crypto module
    const { token, password } = body;

    // Hash the token
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    // Hash the password using bcryptjs
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Check if token is existed and created not more than 48 hours, created_at is timestamp with time zone UTC
    const resetTokenLifetime = getConfig(
      'resetPasswordTokenLifetime',
      48 * 60 * 60 * 1000
    );

    // Convert Date object to mysql timestamp
    dayjs.extend(utc);
    dayjs.extend(timezone);
    const timezoneConfig = getConfig('shop.timezone', 'UTC');
    const now = dayjs
      .tz(new Date(Date.now() - resetTokenLifetime), timezoneConfig)
      .format('YYYY-MM-DD HH:mm:ss');

    const existingToken = await select()
      .from('reset_password_token')
      .where('token', '=', hash)
      .and('created_at', '>=', now)
      .load(pool);

    if (!existingToken) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Token is invalid or expired'
        }
      });
      return;
    }

    // Update the customer with the new password
    const customer = await update('customer')
      .given({
        password: passwordHash
      })
      .where('customer_id', '=', existingToken.customer_id)
      .execute(pool);

    // Delete the token
    await del('reset_password_token')
      .where(
        'reset_password_token_id',
        '=',
        existingToken.reset_password_token_id
      )
      .execute(pool);

    // Delete the passwrord from the customer object
    delete customer.password;

    response.status(OK);
    response.$body = { ...customer };
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
