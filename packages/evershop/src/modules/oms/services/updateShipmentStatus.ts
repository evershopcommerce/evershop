import {
  commit,
  getConnection,
  rollback,
  startTransaction,
  update,
  type PoolClient
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../lib/util/hookable.js';
import type { ShipmentRow } from '../../../types/db/index.js';
import type { ShipmentStatus } from '../../../types/order.js';
import type { ShipmentPhase } from '../types/shipmentPhase.js';
import { recomputeOrderShipmentStatus } from './recomputeOrderShipmentStatus.js';

/**
 * Map of phase → set of phases it's allowed to transition into. Every shipment
 * starts in `shipped` (there is no `pending` phase — see `ShipmentPhase`), and
 * can move to `delivered` or `canceled`. `delivered` / `canceled` are terminal.
 * Same-phase transitions (e.g. `in_transit` → `out_for_delivery`, both
 * `shipped`) are always allowed.
 *
 * See wiki/multi-shipment-design.md → "updateShipmentStatus" → phase-transition rules.
 */
const PHASE_TRANSITIONS: Record<ShipmentPhase, ReadonlySet<ShipmentPhase>> = {
  shipped: new Set<ShipmentPhase>(['shipped', 'delivered', 'canceled']),
  delivered: new Set<ShipmentPhase>(['delivered']),
  canceled: new Set<ShipmentPhase>(['canceled'])
};

export function getPhaseOf(statusCode: string): ShipmentPhase {
  const list = getConfig('oms.order.shipmentStatus', {}) as Record<
    string,
    ShipmentStatus
  >;
  const detail = list[statusCode];
  if (!detail) {
    throw new Error(`Invalid status: ${statusCode}`);
  }
  return detail.phase;
}

/**
 * Lifted from the prior signature for hook signature compatibility; now just
 * validates that the requested per-shipment status exists in the registry.
 * Phase-transition enforcement happens in `changeShipmentStatusForShipment`.
 */
function validateShipmentStatusBeforeUpdate(status: string): boolean {
  const list = getConfig('oms.order.shipmentStatus', {}) as Record<
    string,
    ShipmentStatus
  >;
  if (!list[status]) {
    throw new Error(`Invalid status: ${status}`);
  }
  return false;
}

/**
 * Writes the new status + first-occurrence timestamps to the shipment row.
 * Hookable so extensions can rewrite the persistence step (e.g. to mirror to
 * an audit table) — but the call-site semantics (single shipment, uuid keyed)
 * are settled.
 */
async function changeShipmentStatusForShipment(
  shipmentUuid: string,
  status: string,
  phase: ShipmentPhase,
  connection: PoolClient | typeof pool
): Promise<void> {
  // Raw SQL here on purpose. The query-builder's `.given()` JSON-stringifies
  // object values — there is no `{ isSQL: true, value: '...' }` raw-SQL
  // escape hatch on `.given()` (that convention is only honored inside
  // `.where()`). An earlier version of this code tried it and Postgres saw
  // the marker object as a quoted JSON string bound to a TIMESTAMP column,
  // giving "invalid input syntax for type timestamp" on markDelivered /
  // cancelShipment. The COALESCE expression has no user input, so writing
  // it as a literal in the SQL is safe — only `status` and `uuid` cross the
  // bind boundary.
  const setClauses: string[] = ['"status" = $1'];
  if (phase === 'shipped') {
    setClauses.push(`"shipped_at" = COALESCE("shipped_at", NOW())`);
  } else if (phase === 'delivered') {
    setClauses.push(`"delivered_at" = COALESCE("delivered_at", NOW())`);
  } else if (phase === 'canceled') {
    setClauses.push(`"canceled_at" = COALESCE("canceled_at", NOW())`);
  }
  await connection.query(
    `UPDATE "shipment" SET ${setClauses.join(', ')} WHERE "uuid" = $2`,
    [status, shipmentUuid]
  );
}

interface UpdateContext {
  shipment: ShipmentRow;
  fromStatus: string;
  toStatus: string;
  fromPhase: ShipmentPhase;
  toPhase: ShipmentPhase;
}

async function loadShipment(
  shipmentUuid: string,
  connection: PoolClient | typeof pool
): Promise<ShipmentRow> {
  const { select } = await import('@evershop/postgres-query-builder');
  const row = await select()
    .from('shipment')
    .where('uuid', '=', shipmentUuid)
    .load(connection);
  if (!row) {
    throw new Error(`Shipment not found: ${shipmentUuid}`);
  }
  return row as ShipmentRow;
}

/**
 * Update a shipment's status. Keyed by shipment UUID, NOT order id — that's
 * the breaking signature change. Old callers (`cancelOrder`, `markDelivered`)
 * are migrated to iterate shipments and call this per-shipment.
 *
 * Flow:
 *   1. Load shipment.
 *   2. Validate target status exists in the registry.
 *   3. Look up phase for old and new. Enforce phase transition.
 *   4. Write status + first-occurrence timestamps.
 *   5. Recompute the order's rollup (this triggers the existing
 *      `hookAfter('changeShipmentStatus')` chain in bootstrap, which then
 *      recomputes `order.status` via psoMapping).
 *   6. Emit `shipment_status_changed`. If the new phase is `delivered`,
 *      also emit `shipment_delivered`.
 *
 * **Hookable** via:
 *   - `hookBefore/After('updateShipmentStatus')` — wraps the whole call.
 *   - `hookBefore/After('validateShipmentStatusBeforeUpdate')` — wraps the
 *     registry check (signature unchanged from the legacy code).
 *   - `hookBefore/After('changeShipmentStatusForShipment')` — wraps the
 *     persistence step (new in this rewrite).
 */
// Named function expression: `.name` must equal the `updateShipmentStatus`
// hook key so `hookBefore/AfterUpdateShipmentStatus` fire (hookable keys by
// the wrapped function's `.name`). See checkout.ts for the pattern.
const updateShipmentStatusImpl = async function updateShipmentStatus(
  shipmentUuid: string,
  status: string,
  conn?: PoolClient
): Promise<void> {
  const connection = conn || (await getConnection(pool));
  const ownsTx = !conn;
  // Captured inside the try so the post-tx emits can read them.
  let shipmentId: number | undefined;
  let orderId: number | undefined;
  let fromStatus: string | undefined;
  try {
    if (ownsTx) await startTransaction(connection);

    // 1. Load shipment + 2. Validate target status.
    const shipment = await loadShipment(shipmentUuid, connection);
    shipmentId = shipment.shipment_id;
    orderId = shipment.shipment_order_id;
    fromStatus = shipment.status;
    hookable(validateShipmentStatusBeforeUpdate, { shipmentUuid })(status);

    // 3. Phase transition check.
    const fromPhase = getPhaseOf(shipment.status);
    const toPhase = getPhaseOf(status);
    const allowed = PHASE_TRANSITIONS[fromPhase];
    if (!allowed.has(toPhase)) {
      throw new Error(
        `Cannot transition shipment from phase ${fromPhase} to phase ${toPhase}`
      );
    }

    // 4. Write status + first-occurrence timestamps.
    const ctx: UpdateContext = {
      shipment,
      fromStatus: shipment.status,
      toStatus: status,
      fromPhase,
      toPhase
    };
    await hookable(changeShipmentStatusForShipment, ctx)(
      shipmentUuid,
      status,
      toPhase,
      connection
    );

    // 5. Roll up to order.shipment_status. The `changeShipmentStatus` hook
    //    inside `recomputeOrderShipmentStatus` is what triggers the existing
    //    bootstrap hookAfter that re-runs psoMapping.
    await recomputeOrderShipmentStatus(
      shipment.shipment_order_id,
      connection
    );

    if (ownsTx) await commit(connection);
  } catch (err) {
    error(err);
    if (ownsTx) await rollback(connection);
    throw err;
  }

  // 6. Post-commit events. When we own the tx we just committed, so the
  //    emit can run on the default pool. When the caller owns the tx, we
  //    route through their connection so the event row commits/rolls back
  //    with the caller's work (otherwise subscribers see uncommitted state).
  const emitConn = ownsTx ? undefined : (connection as PoolClient);
  const toPhase = getPhaseOf(status);
  emit(
    'shipment_status_changed',
    {
      shipmentId: shipmentId!,
      orderId: orderId!,
      from: fromStatus!,
      to: status,
      phase: toPhase
    },
    emitConn
  );
  if (toPhase === 'delivered') {
    emit(
      'shipment_delivered',
      {
        shipmentId: shipmentId!,
        orderId: orderId!
      },
      emitConn
    );
  }
}

export const updateShipmentStatus = hookable(updateShipmentStatusImpl, {});

export function hookBeforeUpdateShipmentStatus(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, status: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateShipmentStatus', callback, priority);
}

export function hookAfterUpdateShipmentStatus(
  callback: (
    this: Record<string, never>,
    ...args: [shipmentUuid: string, status: string, conn?: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateShipmentStatus', callback, priority);
}

export function hookBeforeValidateShipmentStatusBeforeUpdate(
  callback: (
    this: { shipmentUuid: string },
    ...args: [status: string]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('validateShipmentStatusBeforeUpdate', callback, priority);
}

export function hookAfterValidateShipmentStatusBeforeUpdate(
  callback: (
    this: { shipmentUuid: string },
    ...args: [status: string]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('validateShipmentStatusBeforeUpdate', callback, priority);
}

export function hookBeforeChangeShipmentStatusForShipment(
  callback: (
    this: UpdateContext,
    ...args: [
      shipmentUuid: string,
      status: string,
      phase: ShipmentPhase,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('changeShipmentStatusForShipment', callback, priority);
}

export function hookAfterChangeShipmentStatusForShipment(
  callback: (
    this: UpdateContext,
    ...args: [
      shipmentUuid: string,
      status: string,
      phase: ShipmentPhase,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('changeShipmentStatusForShipment', callback, priority);
}
