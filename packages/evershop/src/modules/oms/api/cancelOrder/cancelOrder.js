import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import cancelOrder from '../../services/cancelOrder.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  try {
    const { reason } = request.body;
    await cancelOrder(request.params.id, reason);
    response.status(OK);
    response.json({
      data: {}
    });
  } catch (err) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
