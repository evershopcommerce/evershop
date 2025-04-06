import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { error } from '@evershop/evershop/src/lib/log/logger.js';
import createCustomer from '../../services/customer/createCustomer.js';

export default async (request, response, delegate, next) => {
  try {
    const customer = await createCustomer(request.body, {
      routeId: request.currentRoute.id
    });
    // eslint-disable-next-line no-param-reassign
    delegate.createCustomer = customer;
    response.status(OK);
    response.$body = {
      data: {
        ...customer,
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
