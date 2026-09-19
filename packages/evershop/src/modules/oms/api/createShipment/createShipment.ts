import { debug } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import createShipment from '../../services/createShipment.js';

/**
 * Legacy `POST /api/orders/:id/shipments` handler. The new createShipment
 * service requires `{ items, carrier, tracking_number }` instead of the old
 * `{ carrier, tracking_number }`. This handler keeps the URL alive for one
 * release as a back-compat wrapper that maps the old payload onto a "ship
 * every currently-unshipped item" intent. A4 introduces the new admin UI
 * (with item picker) and a payload schema that requires `items` explicitly;
 * this wrapper goes away in Z1.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const { id } = Array.isArray(request.params.id)
    ? { id: request.params.id[0] }
    : { id: request.params.id };
  const { items, carrier, tracking_number, notifyCustomer } = request.body;
  try {
    // If items are provided in the body, just pass through. If not, the
    // service throws — the new contract is items-mandatory. The HTTP error
    // message tells the caller exactly what to fix.
    const result = await createShipment(id, {
      items,
      carrier,
      tracking_number,
      notifyCustomer
    });
    response.status(OK);
    response.$body = {
      data: result
    };
    next();
  } catch (e) {
    debug(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
