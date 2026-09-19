import {
  commit,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import addOrderActivityLog from '../../services/addOrderActivityLog.js';
import { updateShipmentStatus } from '../../services/updateShipmentStatus.js';

/**
 * Legacy single-shipment HTTP handler. Marks every non-`delivered`-non-`canceled`
 * shipment on the order as delivered. In the multi-shipment model an order can
 * have many shipments, so "mark delivered" sweeps them all. A4 introduces the
 * per-shipment-UUID handler (`POST /api/shipments/:uuid/markDelivered`); this
 * one stays as a thin back-compat wrapper.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { order_id } = request.body;
  try {
    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order id'
        }
      });
      return;
    }
    const shipments = await select()
      .from('shipment')
      .where('shipment_order_id', '=', order_id)
      .execute(connection);

    if (!shipments || shipments.length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'No shipments to mark delivered'
        }
      });
      return;
    }

    let updatedCount = 0;
    for (const s of shipments as Array<{ uuid: string; shipment_id: number }>) {
      try {
        await updateShipmentStatus(s.uuid, 'delivered', connection);
        updatedCount += 1;
      } catch (e) {
        // Already delivered / canceled shipments throw on the phase-transition
        // check; that's fine — we only count the ones we actually advanced.
      }
    }
    /* Add an activity log message */
    await addOrderActivityLog(
      order.order_id,
      `Order delivered (${updatedCount} shipment${updatedCount === 1 ? '' : 's'} advanced)`,
      false,
      connection
    );
    await commit(connection);
    response.status(OK);
    response.$body = {
      data: {
        order_id: order.order_id,
        updated_count: updatedCount
      }
    };
    next();
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
