const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const updateCustomerAddress = require('../../services/customer/address/updateCustomerAddress');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', request.params.customer_id)
      .load(pool);
    if (!customer) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid customer'
        }
      });
    }
    const address = await select()
      .from('customer_address')
      .where('uuid', '=', request.params.address_id)
      .and('customer_id', '=', customer.customer_id)
      .load(pool);
    if (!address) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid address'
        }
      });
    }
    const newAddress = await updateCustomerAddress(
      request.params.address_id,
      request.body
    );
    response.status(OK);
    response.$body = {
      data: {
        ...newAddress,
        links: [
          {
            rel: 'edit',
            href: buildUrl('updateCustomerAddress', {
              address_id: address.uuid,
              customer_id: request.params.customer_id
            }),
            action: 'UPDATE',
            types: ['application/json']
          },
          {
            rel: 'delete',
            href: buildUrl('deleteCustomerAddress', {
              address_id: address.uuid,
              customer_id: request.params.customer_id
            }),
            action: 'DELETE',
            types: ['application/json']
          }
        ]
      }
    };
    return next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
