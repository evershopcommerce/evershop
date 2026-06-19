import type { PoolClient } from 'pg';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../lib/util/hookable.js';
import { updateShipmentStatus } from './updateShipmentStatus.js';

/**
 * Trivial wrapper that marks one shipment as delivered. Stays as a service
 * because the "Mark Delivered" admin button is too common to inline.
 *
 * Keyed by shipment UUID — the legacy `markDelivered(orderId, ...)` shape is
 * gone, and the existing `api/markDelivered/markDelivered.ts` HTTP handler is
 * updated to the new path in A4.
 */
// Named function expression so `.name` is `markDelivered` (the hook key),
// even though the binding is `markDeliveredImpl`. hookable() keys hooks by
// the wrapped function's `.name`; a plain `function markDeliveredImpl()`
// declaration would register under `markDeliveredImpl` and the public
// `hookBefore/AfterMarkDelivered` hooks would never fire. See checkout.ts.
const markDeliveredImpl = async function markDelivered(
  shipmentUuid: string,
  conn?: PoolClient
): Promise<void> {
  await updateShipmentStatus(shipmentUuid, 'delivered', conn);
}

export default hookable(markDeliveredImpl, {});

export function hookBeforeMarkDelivered(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('markDelivered', callback, priority);
}

export function hookAfterMarkDelivered(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('markDelivered', callback, priority);
}
