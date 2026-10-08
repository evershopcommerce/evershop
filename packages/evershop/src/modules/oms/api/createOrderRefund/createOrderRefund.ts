import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { refundOrder } from '../../services/refundOrder.js';

/**
 * The one, core refund endpoint. Any payment method whose provider registered a
 * `refund` handler is refundable through here — no per-gateway route. The uuid
 * is in the path; the amount is in the body.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const { amount } = request.body;
    const result = await refundOrder(String(request.params.id), Number(amount));
    response.status(OK);
    response.json({
      data: { paymentStatus: result.status, isFullRefund: result.isFullRefund }
    });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: err.message }
    });
  }
};
