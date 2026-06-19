import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import { setDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import createCustomerAddress from '../../services/customer/address/createCustomerAddress.js';

// Identity/ownership columns a customer must never set on their own address.
const PROTECTED_FIELDS = [
  'customer_id',
  'customer_address_id',
  'uuid',
  'address_id'
];

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: () => void
) => {
  try {
    // The address always belongs to the authenticated customer — never an id
    // taken from the URL or body.
    const currentCustomer = request.getCurrentCustomer();
    if (!currentCustomer) {
      response.status(UNAUTHORIZED);
      return response.json({
        error: {
          status: UNAUTHORIZED,
          message: translate('You must be logged in to manage your addresses')
        }
      });
    }

    const data = { ...request.body };
    PROTECTED_FIELDS.forEach((field) => {
      delete data[field];
    });

    const address = await createCustomerAddress(currentCustomer.uuid, data, {
      routeId: request.currentRoute.id
    });

    setDelegate('createCustomerAddress', address, request);
    response.status(OK);
    response.$body = {
      data: {
        ...address,
        links: [
          {
            rel: 'edit',
            href: buildUrl('updateMyAddress', { address_id: address.uuid }),
            action: 'UPDATE',
            types: ['application/json']
          },
          {
            rel: 'delete',
            href: buildUrl('deleteMyAddress', { address_id: address.uuid }),
            action: 'DELETE',
            types: ['application/json']
          }
        ]
      }
    };
    return next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
