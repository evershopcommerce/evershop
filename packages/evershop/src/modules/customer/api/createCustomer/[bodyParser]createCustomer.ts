import { error } from '../../../../lib/log/logger.js';
import { setDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import createCustomer from '../../services/customer/createCustomer.js';
import { withoutProtectedCustomerFields } from '../../services/customer/protectedCustomerFields.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    // A public route: the storefront sign-up posts here too. Only an admin
    // (session or admin token) may set the group, status and the other fields
    // the store controls.
    const data = request.getCurrentUser()
      ? request.body
      : await withoutProtectedCustomerFields(request.body, {
          routeId: request.currentRoute.id
        });
    const customer = await createCustomer(data, {
      routeId: request.currentRoute.id
    });

    setDelegate('createCustomer', customer, request);
    // The stored password hash never goes back to the caller
    const { password, ...publicCustomer } = customer;
    response.status(OK);
    response.$body = {
      data: {
        ...publicCustomer,
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
