import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { updateShipmentStatus } from '../../services/updateShipmentStatus.js';

/**
 * POST /api/shipments/:shipment_uuid/cancel — cancel a single shipment. The
 * underlying `updateShipmentStatus(uuid, 'canceled')` handles phase-transition
 * checks (terminal `delivered` rejects). The order rollup recompute fires
 * automatically, updating `order.shipment_status`.
 *
 * Whole-order cancellation goes through `cancelOrder` (existing endpoint),
 * which iterates and calls this kind of logic per shipment internally.
 */
export default async (request: EvershopRequest, response, next) => {
  const { shipment_uuid } = request.params;
  try {
    const shipment = await select()
      .from('shipment')
      .where('uuid', '=', shipment_uuid)
      .load(pool);
    if (!shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Invalid shipment id' }
      });
      return;
    }
    await updateShipmentStatus(shipment_uuid as string, 'canceled');
    response.status(OK);
    response.$body = { data: { uuid: shipment_uuid } };
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
