import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteCustomer from '../../services/customer/deleteCustomer.js';

export default async (request, response, next) => {
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
