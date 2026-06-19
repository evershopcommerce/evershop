import { error } from '../../../../lib/log/logger.js';
import { setDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import createCustomerAddress from '../../services/customer/address/createCustomerAddress.js';

export default async (request, response, next) => {
  try {
    const address = await createCustomerAddress(
      request.params.customer_id,
      request.body
    );

    setDelegate('createCustomerAddress', address, request);
    response.status(OK);
    response.$body = {
      data: {
        ...address,
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
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
