import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import deleteCustomerAddress from '../../services/customer/address/deleteCustomerAddress.js';

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
    // Verify the address belongs to the authenticated customer before deleting.
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

    const deletedAddress = await deleteCustomerAddress(addressId, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    return response.json({
      data: deletedAddress
    });
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
