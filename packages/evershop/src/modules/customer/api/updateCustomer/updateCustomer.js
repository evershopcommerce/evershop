const { update, select } = require('@evershop/postgres-query-builder');
const bcrypt = require('bcryptjs');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection();
  try {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id)
      .load(connection, false);

    if (!customer) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid customer id'
        }
      });
      return;
    }

    // Check if password is set
    if (request.body.password) {
      // Hash the password
      const salt = bcrypt.genSaltSync(10);
      request.body.password = bcrypt.hashSync(request.body.password, salt);
    }

    await update('customer')
      .given({
        ...request.body,
        group_id: 1 // TODO: fix me
      })
      .where('uuid', '=', request.params.id)
      .execute(connection, false);

    // Load updated customer
    const updatedCustomer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id)
      .load(connection);

    response.status(OK);
    response.$body = {
      data: {
        ...updatedCustomer,
        links: [
          {
            rel: 'customerGrid',
            href: buildUrl('customerGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('customerEdit', { id: customer.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
