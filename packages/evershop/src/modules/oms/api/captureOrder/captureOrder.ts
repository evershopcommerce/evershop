import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { captureOrder } from '../../services/captureOrder.js';

/**
 * The one, core capture endpoint. Any payment method whose provider registered a
 * `capture` handler is captured through here — no per-gateway route. Full
 * capture of the authorized amount; the uuid is in the path.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const result = await captureOrder(String(request.params.id));
    response.status(OK);
    response.json({ data: { paymentStatus: result.status } });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: err.message }
    });
  }
};
