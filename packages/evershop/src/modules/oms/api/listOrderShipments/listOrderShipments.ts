import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { getShipmentsForOrder } from '../../services/shipment/reads.js';

/**
 * GET /api/orders/:id/shipments — admin list of shipments for an order, with
 * shipment_items embedded. Storefront uses GraphQL; this is for the admin
 * UI in A4 and any future REST-driven tooling.
 */
export default async (request: EvershopRequest, response, next) => {
  const { id } = request.params;
  try {
    const shipments = await getShipmentsForOrder(id as string);
    response.status(OK);
    response.$body = { data: shipments };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
