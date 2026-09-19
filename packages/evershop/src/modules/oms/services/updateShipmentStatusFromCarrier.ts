import { select } from '@evershop/postgres-query-builder';
import { debug, error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../lib/util/hookable.js';
import type { ShipmentRow } from '../../../types/db/index.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { getCarrier } from './carrier/registry.js';
import { getPhaseOf, updateShipmentStatus } from './updateShipmentStatus.js';

export interface CarrierStatusMeta {
  /** Carrier-supplied message ("Out for delivery", etc.). Appended to activity log. */
  message?: string;
  /** Carrier-supplied location ("Distribution Center, Newark NJ"). Appended to activity log. */
  location?: string;
  /** Carrier-supplied event timestamp. Not persisted yet — informational only. */
  timestamp?: string;
}

/**
 * Convergence helper for carrier integrations.
 *
 * Used by extension polling loops or webhook handlers to drive a shipment's
 * registered status from a carrier-observed status. We:
 *
 *   1. Look up the most-recent non-terminal shipment for (carrierCode,
 *      trackingNumber). Terminal phases (delivered, canceled) are excluded
 *      so a stale webhook can't reactivate a closed shipment. Multiple
 *      pending shipments with the same tracking number is a misconfiguration
 *      we don't try to disambiguate — newest wins.
 *   2. Validate `statusCode` against the `oms.order.shipmentStatus`
 *      registry. Unknown codes are LOGGED and SILENTLY ignored — the
 *      carrier may surface vocabulary we don't track.
 *   3. Call `updateShipmentStatus(uuid, statusCode)`. The existing phase
 *      transition checks inside that service reject impossible moves
 *      (`delivered → shipped` from an out-of-order webhook, etc.) which
 *      this helper LOGS and silently swallows so a single bad webhook
 *      can't 500 the caller.
 *   4. Append meta.message / meta.location to the order activity log.
 *
 * Returns void. Errors are logged, never thrown — so a polling loop or
 * webhook handler can iterate confidently. If a real database failure
 * occurs (connection drop, schema mismatch), it'll still log via the
 * standard error path.
 *
 * Hookable as `updateShipmentStatusFromCarrier`.
 *
 * See wiki/multi-shipment-design.md → "Carrier integration" → "Convergence
 * helper".
 */
// Named function expression: `.name` must equal the
// `updateShipmentStatusFromCarrier` hook key so the public hooks fire
// (hookable keys by the wrapped function's `.name`). See checkout.ts.
const updateShipmentStatusFromCarrierImpl = async function updateShipmentStatusFromCarrier(
  carrierCode: string,
  trackingNumber: string,
  statusCode: string,
  meta?: CarrierStatusMeta
): Promise<void> {
  if (!carrierCode || !trackingNumber || !statusCode) {
    debug(
      `updateShipmentStatusFromCarrier called with missing args: carrier=${carrierCode} tracking=${trackingNumber} status=${statusCode}`
    );
    return;
  }

  // 0. Sanity: the carrier should be registered. We don't refuse if it's
  // not — extensions might shut down their carrier extension while their
  // webhook endpoint still receives in-flight events — but we log so the
  // admin can chase down the configuration drift.
  if (!getCarrier(carrierCode)) {
    debug(
      `updateShipmentStatusFromCarrier: carrier '${carrierCode}' is not registered (tracking ${trackingNumber}) — proceeding anyway`
    );
  }

  // 1. Validate the status code against the registry. Unknown → log + skip.
  const list = getConfig('oms.order.shipmentStatus', {}) as Record<
    string,
    { name: string; badge: string; phase: string }
  >;
  if (!list[statusCode]) {
    debug(
      `updateShipmentStatusFromCarrier: unknown status '${statusCode}' (carrier ${carrierCode}, tracking ${trackingNumber}) — skipped`
    );
    return;
  }

  // 2. Find the most-recent non-terminal shipment for this (carrier, tracking).
  const terminalPhases = new Set(['delivered', 'canceled']);
  const candidates = (await select()
    .from('shipment')
    .where('carrier', '=', carrierCode)
    .and('tracking_number', '=', trackingNumber)
    .execute(pool)) as ShipmentRow[];
  const nonTerminal = candidates
    .filter((s) => !terminalPhases.has(getPhaseOf(s.status)))
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  if (nonTerminal.length === 0) {
    debug(
      `updateShipmentStatusFromCarrier: no non-terminal shipment for carrier=${carrierCode} tracking=${trackingNumber} — skipped`
    );
    return;
  }
  const shipment = nonTerminal[0];

  // 3. Drive the status transition. Phase-impossible moves come back as
  // thrown errors — log and continue.
  try {
    await updateShipmentStatus(shipment.uuid, statusCode);
  } catch (e) {
    error(e);
    return;
  }

  // 4. Activity-log the human-friendly summary.
  if (meta?.message || meta?.location) {
    try {
      const parts = [
        `Carrier update (${carrierCode}): ${list[statusCode].name}`,
        meta.message,
        meta.location ? `at ${meta.location}` : undefined
      ].filter(Boolean);
      await addOrderActivityLog(
        shipment.shipment_order_id,
        parts.join(' — '),
        false,
        pool as any
      );
    } catch (e) {
      error(e);
    }
  }
}

export const updateShipmentStatusFromCarrier = hookable(
  updateShipmentStatusFromCarrierImpl,
  {}
);

export function hookBeforeUpdateShipmentStatusFromCarrier(
  callback: (
    this: Record<string, never>,
    ...args: [
      carrierCode: string,
      trackingNumber: string,
      statusCode: string,
      meta?: CarrierStatusMeta
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateShipmentStatusFromCarrier', callback, priority);
}

export function hookAfterUpdateShipmentStatusFromCarrier(
  callback: (
    this: Record<string, never>,
    ...args: [
      carrierCode: string,
      trackingNumber: string,
      statusCode: string,
      meta?: CarrierStatusMeta
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateShipmentStatusFromCarrier', callback, priority);
}
