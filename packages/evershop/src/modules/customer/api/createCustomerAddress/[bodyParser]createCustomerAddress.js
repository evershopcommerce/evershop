import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { error } from '@evershop/evershop/src/lib/log/logger.js';
import createCustomerAddress from '../../services/customer/address/createCustomerAddress.js';

export default async (request, response, delegate, next) => {
  try {
    const address = await createCustomerAddress(
      request.params.customer_id,
      request.body
    );
    // eslint-disable-next-line no-param-reassign
    delegate.createCustomerAddress = address;
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
