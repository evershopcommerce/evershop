import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateCustomerAddress from '../../services/customer/address/updateCustomerAddress.js';

// Identity/ownership columns a customer must never change on their own address.
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

    const addressId = request.params.address_id as string;
    // Verify the address belongs to the authenticated customer before touching it.
    const address = await select()
      .from('customer_address')
      .where('uuid', '=', addressId)
      .and('customer_id', '=', currentCustomer.customer_id)
      .load(pool);
    if (!address) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('Invalid address')
        }
      });
    }

    const data = { ...request.body };
    PROTECTED_FIELDS.forEach((field) => {
      delete data[field];
    });

    const newAddress = await updateCustomerAddress(addressId, data, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.$body = {
      data: {
        ...newAddress,
        links: [
          {
            rel: 'edit',
            href: buildUrl('updateMyAddress', {
              address_id: address.uuid
            }),
            action: 'UPDATE',
            types: ['application/json']
          },
          {
            rel: 'delete',
            href: buildUrl('deleteMyAddress', {
              address_id: address.uuid
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
