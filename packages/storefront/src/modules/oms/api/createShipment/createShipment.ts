import { rollback, startTransaction } from '@storefront/postgres-query-builder';
import { debug } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { StorefrontRequest } from '../../../../types/request.js';
import { StorefrontResponse } from '../../../../types/response.js';
import createShipment from '../../services/createShipment.js';

export default async (
  request: StorefrontRequest,
  response: StorefrontResponse,
  next
) => {
  const connection = await getConnection();
  await startTransaction(connection);
  const { id } = request.params;
  const { carrier, tracking_number } = request.body;
  try {
    const shipment = await createShipment(id, carrier, tracking_number);
    response.status(OK);
    response.$body = {
      data: shipment
    };
    next();
  } catch (e) {
    debug(e);
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
