import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import addOrderActivityLog from '../../services/addOrderActivityLog.js';

/**
 * PATCH /api/shipments/:shipment_uuid — update carrier and/or tracking number
 * on a single shipment, addressed by its UUID. Multi-shipment-friendly
 * replacement for the legacy `PATCH /api/orders/:order_id/shipments/:shipment_id`
 * (kept as back-compat in `api/updateShipment/`; Z1 drops it).
 */
export default async (request: EvershopRequest, response, next) => {
  const { shipment_uuid } = request.params;
  const { carrier, tracking_number } = request.body;
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const shipment = await select()
      .from('shipment')
      .where('uuid', '=', shipment_uuid)
      .load(connection);
    if (!shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: 'Invalid shipment id' }
      });
      await rollback(connection);
      return;
    }

    const given: Record<string, unknown> = {};
    if (typeof carrier === 'string') given.carrier = carrier;
    if (typeof tracking_number === 'string') given.tracking_number = tracking_number;
    if (Object.keys(given).length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Nothing to update; provide carrier and/or tracking_number'
        }
      });
      await rollback(connection);
      return;
    }

    await update('shipment')
      .given(given)
      .where('uuid', '=', shipment_uuid)
      .execute(connection);
    await addOrderActivityLog(
      shipment.shipment_order_id,
      'Shipment information updated',
      false,
      connection
    );
    await commit(connection);

    const updatedShipment = await select()
      .from('shipment')
      .where('uuid', '=', shipment_uuid)
      .load(pool);

    response.status(OK);
    response.$body = { data: updatedShipment };
    next();
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
