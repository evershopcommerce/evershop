import {
  OK,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import deleteCustomer from '../../services/customer/deleteCustomer.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  try {
    const customer = await deleteCustomer(request.params.id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: customer
    });
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
