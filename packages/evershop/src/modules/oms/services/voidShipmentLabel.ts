import {
  select,
  type PoolClient,
  update
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../lib/util/hookable.js';
import type { ShipmentRow } from '../../../types/db/index.js';
import type { CarrierMethodContext } from '../types/carrier.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { getCarrier } from './carrier/registry.js';
import { getPhaseOf } from './updateShipmentStatus.js';

/**
 * Void a previously purchased shipping label. Allowed while the shipment is
 * in the `shipped` phase (which is the create phase under the new model —
 * the pre-shipped state is gone). Terminal phases (`delivered`, `canceled`)
 * reject because the carrier API will refuse to void a committed label.
 *
 * Steps:
 *   1. Load shipment by uuid.
 *   2. Validate: `label_url` is set, shipment phase is `shipped`, carrier
 *      is registered and implements `voidLabel`.
 *   3. Call `carrier.voidLabel(ctx)` with a `CarrierMethodContext`
 *      assembled from the shipment row (trackingNumber + carrierShipmentId
 *      + metadata). Throws on carrier error.
 *   4. Clear `label_url`, `label_format` (keep `tracking_number` — there's a
 *      record of the original PO that the carrier may still surface in their
 *      portal).
 *   5. Emit `shipment_label_voided`.
 *   6. Log to order activity.
 *
 * Hookable as `voidShipmentLabel` (whole call) and `callCarrierVoidLabel`
 * (just the network call).
 */
// Named function expression: `.name` must equal the `voidShipmentLabel` hook
// key so `hookBefore/AfterVoidShipmentLabel` actually fire (hookable keys by
// the wrapped function's `.name`). See checkout.ts for the pattern.
const voidShipmentLabelImpl = async function voidShipmentLabel(
  shipmentUuid: string,
  conn?: PoolClient
): Promise<void> {
  const connection = conn || pool;
  const shipment = (await select()
    .from('shipment')
    .where('uuid', '=', shipmentUuid)
    .load(connection)) as ShipmentRow | null;
  if (!shipment) {
    throw new Error(`Shipment not found: ${shipmentUuid}`);
  }
  if (!shipment.label_url) {
    throw new Error(
      `Shipment ${shipmentUuid} has no purchased label to void`
    );
  }
  const phase = getPhaseOf(shipment.status);
  if (phase !== 'shipped') {
    throw new Error(
      `Cannot void label for shipment ${shipmentUuid} — already in terminal phase '${phase}'`
    );
  }
  if (!shipment.carrier) {
    throw new Error(
      `Shipment ${shipmentUuid} has no carrier code — cannot void label`
    );
  }
  const carrier = getCarrier(shipment.carrier);
  if (!carrier) {
    throw new Error(
      `Carrier '${shipment.carrier}' is not registered — install the carrier extension to void this label`
    );
  }
  if (!carrier.voidLabel) {
    throw new Error(
      `Carrier '${shipment.carrier}' does not implement voidLabel`
    );
  }
  if (!shipment.tracking_number) {
    throw new Error(
      `Shipment ${shipmentUuid} has a label but no tracking number — inconsistent state, refusing to void`
    );
  }

  // Build the envelope from the durable shipment-row state. UPS and similar
  // carriers void by `carrierShipmentId` even when the tracking number is
  // known; aggregators read `metadata` to route to the right sub-carrier.
  const ctx: CarrierMethodContext = {
    trackingNumber: shipment.tracking_number,
    carrierShipmentId: shipment.carrier_shipment_id ?? undefined,
    metadata: shipment.carrier_metadata ?? undefined
  };
  await hookable(callCarrierVoidLabel, { carrier, ctx })(carrier, ctx);

  await update('shipment')
    .given({ label_url: null, label_format: null })
    .where('uuid', '=', shipmentUuid)
    .execute(connection);

  emit('shipment_label_voided', {
    shipmentId: shipment.shipment_id,
    orderId: shipment.shipment_order_id,
    trackingNumber: shipment.tracking_number
  });
  try {
    await addOrderActivityLog(
      shipment.shipment_order_id,
      `Shipping label voided (carrier ${shipment.carrier}, tracking ${shipment.tracking_number})`,
      false,
      connection as PoolClient
    );
  } catch (e) {
    error(e);
  }
}

async function callCarrierVoidLabel(
  carrier: NonNullable<ReturnType<typeof getCarrier>>,
  ctx: CarrierMethodContext
): Promise<void> {
  if (!carrier.voidLabel) {
    throw new Error(`Carrier '${carrier.code}' does not implement voidLabel`);
  }
  await carrier.voidLabel(ctx);
}

export const voidShipmentLabel = hookable(voidShipmentLabelImpl, {});

export function hookBeforeVoidShipmentLabel(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('voidShipmentLabel', callback, priority);
}

export function hookAfterVoidShipmentLabel(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('voidShipmentLabel', callback, priority);
}
