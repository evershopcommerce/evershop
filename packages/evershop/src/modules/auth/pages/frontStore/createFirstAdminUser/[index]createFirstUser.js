const {
  startTransaction,
  commit,
  rollback,
  insert
} = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { hashPassword } = require('../../../services/hashPassword');

module.exports = async (request, response, delegate, next) => {
  const connection = await pool.connect();
  await startTransaction(connection);
  try {
    // Call next if it is a GET request
    if (request.method === 'GET') {
      next();
      return;
    }
    const { full_name, email, password } = request.body;
    // Make sure the full name is not empty
    if (!full_name) {
      response.status(INVALID_PAYLOAD);
      response.json({
        status: INVALID_PAYLOAD,
        message: 'Full name is required'
      });
      return;
    }
    // Validate the email using regex
    if (
      !email.match(
        // eslint-disable-next-line no-useless-escape
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      )
    ) {
      response.status(INVALID_PAYLOAD);
      response.json({
        status: INVALID_PAYLOAD,
        message: 'Invalid email'
      });
      return;
    }

    // Validate the password
    if (password.length < 8) {
      response.status(INVALID_PAYLOAD);
      response.json({
        status: INVALID_PAYLOAD,
        message: 'Your password must be at least 8 characters.'
      });
      return;
    }
    if (password.search(/[a-z]/i) < 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        status: INVALID_PAYLOAD,
        message: 'Your password must contain at least one letter.'
      });
      return;
    }
    if (password.search(/[0-9]/) < 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        status: INVALID_PAYLOAD,
        message: 'Your password must contain at least one digit.'
      });
      return;
    }

    // Create the admin user
    await insert('admin_user')
      .given({
        full_name,
        email,
        password: hashPassword(password)
      })
      .execute(connection);

    await commit(connection);
    response.status(200);
    response.json({
      status: 200,
      data: {}
    });
    return;
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      status: INTERNAL_SERVER_ERROR,
      message: e.message
    });
  }
};
