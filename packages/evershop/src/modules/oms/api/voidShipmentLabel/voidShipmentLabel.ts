import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { voidShipmentLabel } from '../../services/voidShipmentLabel.js';

/**
 * DELETE /api/shipments/:shipment_uuid/label — void a previously purchased
 * shipping label via the registered carrier's `voidLabel` method. Only valid
 * while the shipment is still in the `pending` phase. See
 * `services/voidShipmentLabel.ts` for the full validation chain.
 */
export default async (request: EvershopRequest, response, next) => {
  const { shipment_uuid } = request.params;
  try {
    await voidShipmentLabel(shipment_uuid as string);
    response.status(OK);
    response.$body = { data: { uuid: shipment_uuid } };
    next();
  } catch (e) {
    const message = (e as Error).message;
    const status =
      /not found|no purchased label|already left|not registered|does not implement|no carrier code|inconsistent state/.test(
        message
      )
        ? INVALID_PAYLOAD
        : INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message } });
  }
};
