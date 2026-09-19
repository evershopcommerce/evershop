import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import markDelivered from '../../services/markDelivered.js';

/**
 * POST /api/shipments/:shipment_uuid/markDelivered — per-shipment delivered
 * action. The legacy `POST /deliveries` (in `api/markDelivered/`) iterates
 * every shipment on an order; this targets one. Both stay alive — the legacy
 * is dropped in Z1.
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
    await markDelivered(shipment_uuid as string);
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
