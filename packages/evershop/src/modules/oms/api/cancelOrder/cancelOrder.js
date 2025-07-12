import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import cancelOrder from '../../services/cancelOrder.js';

export default async (request, response, next) => {
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
