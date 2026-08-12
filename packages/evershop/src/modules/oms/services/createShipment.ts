import {
  commit,
  insert,
  rollback,
  select,
  startTransaction,
  type PoolClient
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { error } from '../../../lib/log/logger.js';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';
import type {
  OrderAddressRow,
  OrderItemRow,
  OrderRow,
  ShipmentRow
} from '../../../types/db/index.js';
import {
  buildDefaultParcels,
  type PackingCandidate
} from '../../checkout/services/cart/packing.js';
import {
  getDimensionUnit,
  getStoreAddress,
  getStoreCity,
  getStoreCountry,
  getStoreName,
  getStorePostalCode,
  getStoreProvince,
  getWeightUnit
} from '../../setting/services/setting.js';
import type {
  Carrier,
  CarrierAddress,
  CarrierItem,
  CreateLabelInput,
  LabelResult,
  Parcel
} from '../types/carrier.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { getCarrier } from './carrier/registry.js';
import { recomputeOrderShipmentStatus } from './recomputeOrderShipmentStatus.js';

/**
 * Payload accepted by the new createShipment service. The API stays pure —
 * `items` is mandatory and non-empty; the admin UI handles the
 * "ship everything that's left" convenience by pre-populating the picker.
 *
 * See wiki/multi-shipment-design.md → "Services" → "createShipment".
 */
export interface CreateShipmentPayload {
  items: Array<{ order_item_id: number; qty: number }>;
  carrier: string;
  tracking_number?: string;
  notifyCustomer?: boolean;
}

export interface CreateShipmentResult {
  shipment: ShipmentRow;
  items: Array<{ order_item_id: number; qty: number }>;
  /** `true` if a label was created as part of this call (Stream C). */
  labelCreated: boolean;
}

/**
 * Per-item pre-check result. Used to thread between phase 1 (validation) and
 * phase 2 (insert) so we don't re-load order_items in both.
 */
interface ItemCheck {
  order_item_id: number;
  qty: number;
  qty_ordered: number;
  qty_already_shipped: number;
  no_shipping_required: boolean;
}

const PER_ORDER_LOCK_PREFIX = 'shipment';

function lockKey(orderId: number): string {
  return `${PER_ORDER_LOCK_PREFIX}:${orderId}`;
}

async function acquireOrderLock(
  connection: PoolClient,
  orderId: number
): Promise<void> {
  await connection.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
    lockKey(orderId)
  ]);
}

async function validateShipmentItems(
  order: OrderRow,
  payload: CreateShipmentPayload,
  connection: PoolClient | typeof pool
): Promise<ItemCheck[]> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('items is required and must be a non-empty array');
  }
  if (!payload.carrier || typeof payload.carrier !== 'string') {
    throw new Error('carrier is required');
  }
  if (!getCarrier(payload.carrier)) {
    throw new Error(
      `Unknown carrier '${payload.carrier}'. Install or register the carrier extension first.`
    );
  }

  // Load the order_item rows referenced in the payload.
  const itemIds = payload.items.map((i) => i.order_item_id);
  const orderItems = (await select()
    .from('order_item')
    .where('order_item_id', 'IN', itemIds)
    .and('order_item_order_id', '=', order.order_id)
    .execute(connection)) as OrderItemRow[];

  if (orderItems.length !== payload.items.length) {
    throw new Error(
      `One or more order_item_ids not found on order ${order.order_id}`
    );
  }
  // Reject any item that doesn't require shipping.
  const digitalItem = orderItems.find((oi) => oi.no_shipping_required === true);
  if (digitalItem) {
    throw new Error(
      `Item ${digitalItem.product_sku} does not require shipping and cannot be in a shipment`
    );
  }

  // Sum already-shipped qty per item across non-canceled shipments.
  // Pending shipments DO count as "in flight" — a concurrent second shipment
  // that re-includes the same item would over-allocate it.
  const alreadyShipped = new Map<number, number>();
  const result = await connection.query(
    `SELECT si.order_item_id, COALESCE(SUM(si.qty), 0) AS qty
       FROM shipment_item si
       JOIN shipment s ON s.shipment_id = si.shipment_id
      WHERE si.order_item_id = ANY($1::int[])
        AND s.status NOT IN (SELECT code FROM (
          VALUES ${cancelStatusCodesAsValues()}
        ) AS c(code))
      GROUP BY si.order_item_id`,
    [itemIds]
  );
  for (const r of result.rows as Array<{
    order_item_id: number;
    qty: string | number;
  }>) {
    alreadyShipped.set(Number(r.order_item_id), Number(r.qty));
  }

  // Per-item bounds check.
  const checks: ItemCheck[] = [];
  for (const requested of payload.items) {
    if (!Number.isInteger(requested.qty) || requested.qty <= 0) {
      throw new Error(
        `Invalid qty for order_item ${requested.order_item_id}: ${requested.qty}`
      );
    }
    const oi = orderItems.find(
      (x) => x.order_item_id === requested.order_item_id
    );
    if (!oi) {
      throw new Error(
        `order_item ${requested.order_item_id} not found on order ${order.order_id}`
      );
    }
    const already = alreadyShipped.get(oi.order_item_id) ?? 0;
    const remaining = oi.qty - already;
    if (requested.qty > remaining) {
      if (remaining <= 0) {
        throw new Error(`Item ${oi.product_sku} is already fully shipped`);
      }
      throw new Error(
        `Cannot ship ${requested.qty} of ${oi.product_sku} — only ${remaining} unshipped`
      );
    }
    checks.push({
      order_item_id: oi.order_item_id,
      qty: requested.qty,
      qty_ordered: oi.qty,
      qty_already_shipped: already,
      no_shipping_required: oi.no_shipping_required
    });
  }
  return checks;
}

/**
 * Returns a SQL VALUES literal of every shipment_status code whose phase is
 * `canceled`. Used by `validateShipmentItems` to filter out canceled
 * shipments from the already-shipped sum.
 *
 * Defensive: if no canceled-phase statuses are registered (shouldn't happen
 * — the default `canceled` is always there), returns a single sentinel that
 * matches no real row.
 */
function cancelStatusCodesAsValues(): string {
  const list = getConfig('oms.order.shipmentStatus', {}) as unknown as Record<
    string,
    { phase: string }
  >;
  const cancelCodes = Object.entries(list)
    .filter(([, d]) => d.phase === 'canceled')
    .map(([code]) => code.replace(/'/g, "''"));
  if (cancelCodes.length === 0)
    return `('__no_canceled_statuses_registered__')`;
  return cancelCodes.map((c) => `('${c}')`).join(', ');
}

async function insertShipment(
  payload: CreateShipmentPayload,
  order: OrderRow,
  connection: PoolClient,
  resolved?: {
    trackingNumber?: string;
    labelUrl?: string;
    labelFormat?: string;
    carrierShipmentId?: string;
    metadata?: Record<string, unknown>;
    trackingUrl?: string;
  }
): Promise<ShipmentRow> {
  const inserted = await insert('shipment')
    .given({
      shipment_order_id: order.order_id,
      carrier: payload.carrier,
      tracking_number:
        resolved?.trackingNumber ?? payload.tracking_number ?? null,
      // New shipments land in the `shipped` phase. Stock was deducted at order
      // placement, so no pre-shipped reservation is needed; a shipment row
      // exists iff something was actually shipped. See multi-shipment-design
      // → "No pre-ship state" for the rationale. There is no `pending`
      // shipment phase; `pending` survives only as an order-level rollup value
      // ("no items shipped yet"), produced by the item math, not a shipment row.
      status: 'shipped',
      label_url: resolved?.labelUrl ?? null,
      label_format: resolved?.labelFormat ?? null,
      carrier_shipment_id: resolved?.carrierShipmentId ?? null,
      carrier_metadata: resolved?.metadata ?? null,
      tracking_url: resolved?.trackingUrl ?? null
    })
    .execute(connection);
  return inserted as unknown as ShipmentRow;
}

/**
 * Map an `order_address` row into the carrier-input `CarrierAddress` shape.
 * Names diverge enough between the two that a plain camelCase isn't enough.
 */
function toCarrierAddress(row: OrderAddressRow | null): CarrierAddress {
  if (!row) {
    throw new Error(
      'Order shipping address is missing — cannot build carrier input'
    );
  }
  return {
    fullName: row.full_name ?? '',
    address1: row.address_1 ?? '',
    address2: row.address_2 ?? undefined,
    city: row.city ?? '',
    province: row.province ?? undefined,
    postcode: row.postcode ?? '',
    country: row.country ?? '',
    phone: row.telephone ?? undefined
  };
}

/**
 * Read the merchant-chosen default service code out of the order's
 * shipping-method snapshot. The snapshot was written at checkout from
 * `coreShippingProvider.getMethods` (which mirrors
 * `core_shipping_method.default_service_code`). Returns undefined when the
 * snapshot is missing, malformed, or the merchant didn't set a default —
 * the carrier then falls through to its own default service.
 */
function extractSnapshotServiceCode(
  shippingMethodData: OrderRow['shipping_method_data']
): string | undefined {
  if (!shippingMethodData || typeof shippingMethodData !== 'object') {
    return undefined;
  }
  const snapshot = (shippingMethodData as { snapshot?: unknown }).snapshot;
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const value = (snapshot as { serviceCode?: unknown }).serviceCode;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Build the input the carrier provider sees when we ask it to purchase a
 * label. Pure transformation — pulls together the order, items, shipping
 * address, and origin already on hand at this point in `createShipment`.
 *
 * `serviceCode` threads from the order's shipping-method snapshot (sourced
 * from `core_shipping_method.default_service_code` at checkout). When the
 * merchant configured a service per method, the carrier prints labels for
 * that exact service; otherwise the field stays undefined and the carrier
 * falls through to its own default. The wire is the missing leg of the
 * provider↔carrier bridge that C3 only half-finished.
 */
async function buildCreateLabelInput(
  order: OrderRow,
  shipmentItems: OrderItemRow[],
  checks: ItemCheck[]
): Promise<CreateLabelInput> {
  const shippingAddress = (await select()
    .from('order_address')
    .where('order_address_id', '=', order.shipping_address_id)
    .load(pool)) as OrderAddressRow | null;
  const [storeName, country, province, city, address1, postcode] =
    await Promise.all([
      getStoreName(),
      getStoreCountry(),
      getStoreProvince(),
      getStoreCity(),
      getStoreAddress(),
      getStorePostalCode()
    ]);
  const shipFrom: CarrierAddress = {
    fullName: storeName ?? 'Store',
    address1: address1 ?? '',
    city: city ?? '',
    province: province ?? undefined,
    postcode: postcode ?? '',
    country: country ?? ''
  };
  // Weight unit is store-wide (admin setting `weightUnit`); `order_item.product_weight`
  // is stored in that unit. Normalize to the `Weight.unit` vocabulary.
  const rawUnit = String(getWeightUnit())
    .toLowerCase()
    .replace(/s$/, '');
  const weightUnit = (['kg', 'g', 'lb', 'oz'] as const).find(
    (u) => u === rawUnit
  ) ?? 'kg';
  // Dimension unit is store-wide (admin setting `dimensionUnit`); the order_item
  // package snapshot is stored in that unit.
  const rawDimUnit = String(getDimensionUnit()).toLowerCase();
  const dimensionUnit = (['cm', 'mm', 'in'] as const).find(
    (u) => u === rawDimUnit
  ) ?? 'cm';

  let goodsWeight = 0;
  const parcelCandidates: PackingCandidate[] = [];
  const items: CarrierItem[] = checks.map((c) => {
    const oi = shipmentItems.find((x) => x.order_item_id === c.order_item_id);
    const weightValue = oi?.product_weight ? Number(oi.product_weight) : NaN;
    // `final_price` is the tax-exclusive per-unit transaction value after
    // discounts — the correct customs basis (what the customer actually paid),
    // in the order's currency.
    const priceValue = oi ? Number(oi.final_price ?? oi.product_price) : NaN;
    // Package snapshot frozen on the order_item at placement. NULL for
    // legacy/virtual products — dims stay undefined and the item contributes
    // no parcel candidate.
    const length = oi?.package_length ? Number(oi.package_length) : NaN;
    const width = oi?.package_width ? Number(oi.package_width) : NaN;
    const height = oi?.package_height ? Number(oi.package_height) : NaN;
    const hasDims =
      Number.isFinite(length) && Number.isFinite(width) && length > 0 && width > 0;
    if (Number.isFinite(weightValue)) {
      goodsWeight += weightValue * c.qty;
    }
    if (hasDims) {
      parcelCandidates.push({
        packageUuid: null,
        name: null,
        length,
        width,
        height: Number.isFinite(height) ? height : 0,
        tareWeight: oi?.package_weight ? Number(oi.package_weight) : 0
      });
    }
    return {
      sku: oi?.product_sku ?? '',
      name: oi?.product_name ?? '',
      qty: c.qty,
      weight: Number.isFinite(weightValue)
        ? { value: weightValue, unit: weightUnit }
        : undefined,
      unitPrice: Number.isFinite(priceValue)
        ? { value: priceValue, currency: order.currency }
        : undefined,
      dimensions: hasDims
        ? {
            length,
            width,
            height: Number.isFinite(height) ? height : 0,
            unit: dimensionUnit
          }
        : undefined
    };
  });

  // Per-SHIPMENT parcel: the same single-parcel heuristic as the cart's
  // `cartPackages` default, run over THIS shipment's items (a multi-shipment
  // order ships subsets — the cart-level proposal doesn't apply). Parcel
  // weight = goods + tare; per-item weights above stay goods-only, so tare
  // enters the label exactly once. Empty candidates (all-legacy order) leave
  // `parcel` undefined and carriers keep their fallback.
  const [proposal] = buildDefaultParcels(parcelCandidates, goodsWeight);
  const parcel: Parcel | undefined = proposal
    ? {
        weight: {
          value: parseFloat((goodsWeight + proposal.tareWeight).toFixed(4)),
          unit: weightUnit
        },
        dimensions: {
          length: proposal.length,
          width: proposal.width,
          height: proposal.height,
          unit: dimensionUnit
        }
      }
    : undefined;

  return {
    orderNumber: order.order_number,
    orderId: order.order_id,
    shipFrom,
    shipTo: toCarrierAddress(shippingAddress),
    items,
    parcel,
    serviceCode: extractSnapshotServiceCode(order.shipping_method_data)
  };
}

/**
 * Hookable wrapper around the carrier's createLabel call. Lives behind a
 * hook so an extension can intercept (e.g. to inject a service code from a
 * separate quote response).
 */
async function callCarrierCreateLabel(
  carrier: Carrier,
  input: CreateLabelInput
): Promise<LabelResult> {
  if (!carrier.createLabel) {
    throw new Error(
      `Carrier '${carrier.code}' does not implement createLabel — provide a tracking_number or register a carrier with label support.`
    );
  }
  return carrier.createLabel(input);
}

async function insertShipmentItems(
  shipment: ShipmentRow,
  checks: ItemCheck[],
  connection: PoolClient
): Promise<void> {
  for (const check of checks) {
    await insert('shipment_item')
      .given({
        shipment_id: shipment.shipment_id,
        order_item_id: check.order_item_id,
        qty: check.qty
      })
      .execute(connection);
  }
}

/**
 * Create a shipment for an order. See the spec for the full two-phase flow.
 * In PR1, the carrier registry (Stream C) doesn't exist yet, so the
 * `createLabel`-driven path is not wired — `tracking_number` is effectively
 * required in the payload. The two-phase structure is in place so C4 can plug
 * the label flow in without restructuring the service.
 */
// Named function expression: `.name` must equal the `createShipment` hook key
// so `hookBefore/AfterCreateShipment` fire (hookable keys by the wrapped
// function's `.name`). See checkout.ts for the pattern.
const createShipmentImpl = async function createShipment(
  orderUuid: string,
  payload: CreateShipmentPayload,
  conn?: PoolClient
): Promise<CreateShipmentResult> {
  const ownsTx = !conn;
  // ─── Phase 1: validation (no DB writes, no advisory lock yet) ─────────────
  //
  // Pre-tx reads use the SHARED pool — NOT a dedicated PoolClient.
  // The query-builder's auto-release only short-circuits when the connection
  // has `INTRANSACTION = true` (set by `startTransaction`). Pre-tx reads on a
  // raw `getConnection()` PoolClient release it back to the pool after the
  // first `.load()` / `.execute()`, leaving phase 2's `startTransaction`
  // operating on a detached client (the "Release called on client which has
  // already been released to the pool" error).
  //
  // When the caller passes their own `conn`, they've already opened a tx on
  // it, so `INTRANSACTION` is set and reads on it are safe.
  const readConn = conn || pool;

  const order = (await select()
    .from('order')
    .where('uuid', '=', orderUuid)
    .load(readConn)) as OrderRow | null;
  if (!order) {
    throw new Error(`Order not found: ${orderUuid}`);
  }

  // Items, qty, carrier, digital-rejection.
  const checks = await hookable(validateShipmentItems, { order, payload })(
    order,
    payload,
    readConn
  );

  // Tracking-number resolution:
  //   - tracking_number provided → use it; no createLabel call.
  //   - tracking_number absent + carrier implements createLabel → purchase a
  //     label via the carrier API OUTSIDE the transaction; carry the
  //     returned tracking number / label URL through to phase 2.
  //   - tracking_number absent + carrier doesn't implement createLabel → fine.
  //     We create a shipment with no tracking number. The downstream consumers
  //     (Track link, Print Label, customer email tracking section) are all
  //     already gated on tracking_number / labelUrl being present and
  //     degrade gracefully when they're not. The canonical example is the
  //     built-in "Custom / Other" carrier: zero capabilities, no API to
  //     call, no tracking number to record — admin just marks "yes a
  //     shipment exists" without any carrier-side artifact.
  //
  //     The admin UI already gates the tracking-number input on the
  //     carrier's `hasTrackingCapability` (any of generateTrackingUrl /
  //     createLabel / voidLabel / fetchStatus). When the input is hidden,
  //     no tracking number reaches the payload — this branch handles that
  //     case without throwing.
  let labelCreated = false;
  let labelResult: LabelResult | null = null;
  if (!payload.tracking_number) {
    // Carrier registration already validated by validateShipmentItems above.
    const carrierObj = getCarrier(payload.carrier)!;
    if (carrierObj.createLabel) {
      // Load the order_item rows once for the input. validateShipmentItems
      // already fetched them but didn't return them — refetch is fine.
      const orderItemIdsForInput = payload.items.map((i) => i.order_item_id);
      const orderItemsForInput = (await select()
        .from('order_item')
        .where('order_item_id', 'IN', orderItemIdsForInput)
        .execute(pool)) as OrderItemRow[];
      const input = await buildCreateLabelInput(
        order,
        orderItemsForInput,
        checks
      );
      labelResult = await hookable(callCarrierCreateLabel, {
        carrier: carrierObj,
        input
      })(carrierObj, input);
      labelCreated = true;
    }
    // Else: no createLabel, no tracking number. Shipment is created with
    // tracking_number = null. Nothing to do here.
  }

  // ─── Phase 2: transaction with advisory lock ──────────────────────────────
  // Now (and only now) acquire a dedicated PoolClient. `startTransaction`
  // sets `INTRANSACTION = true` on it so subsequent `.execute(connection)`
  // calls inside this block won't auto-release.
  const connection = conn || (await getConnection());
  try {
    if (ownsTx) await startTransaction(connection);
    await acquireOrderLock(connection as PoolClient, order.order_id);

    // Re-validate qty under the lock — concurrent shipments may have committed
    // between phase 1 and phase 2.
    await hookable(validateShipmentItems, { order, payload })(
      order,
      payload,
      connection
    );

    const shipment = await hookable(insertShipment, { order, payload })(
      payload,
      order,
      connection as PoolClient,
      labelResult
        ? {
            trackingNumber: labelResult.trackingNumber,
            labelUrl: labelResult.labelUrl,
            labelFormat: labelResult.labelFormat,
            carrierShipmentId: labelResult.carrierShipmentId,
            metadata: labelResult.metadata,
            trackingUrl: labelResult.trackingUrl
          }
        : undefined
    );
    await hookable(insertShipmentItems, { shipment, checks })(
      shipment,
      checks,
      connection as PoolClient
    );

    // Initial rollup recompute. With one new pending shipment, the rollup
    // moves the order to `partially_shipped` (or stays `pending` if nothing
    // has shipped from a phase perspective yet — pending shipments don't
    // count as "shipped" until `updateShipmentStatus` advances them).
    await recomputeOrderShipmentStatus(order.order_id, connection);

    await addOrderActivityLog(
      order.order_id,
      `Shipment created (${payload.items.length} item${
        payload.items.length === 1 ? '' : 's'
      }, carrier ${payload.carrier})`,
      false,
      connection as PoolClient
    );

    if (ownsTx) await commit(connection);

    // Post-commit events. When we own the tx we just committed, so the emit
    // can run on the default pool. When the caller owns the tx, we route
    // through their connection so the event row commits/rolls back with the
    // rest of their work — otherwise subscribers see uncommitted state.
    const emitConn = ownsTx ? undefined : (connection as PoolClient);
    emit(
      'shipment_created',
      {
        shipmentId: shipment.shipment_id,
        orderId: order.order_id,
        notifyCustomer: payload.notifyCustomer !== false
      },
      emitConn
    );
    if (labelCreated && labelResult) {
      emit(
        'shipment_label_created',
        {
          shipmentId: shipment.shipment_id,
          orderId: order.order_id,
          labelUrl: labelResult.labelUrl,
          trackingNumber: labelResult.trackingNumber
        },
        emitConn
      );
    }

    return {
      shipment,
      items: checks.map((c) => ({
        order_item_id: c.order_item_id,
        qty: c.qty
      })),
      labelCreated
    };
  } catch (e) {
    error(e);
    if (ownsTx) await rollback(connection);
    // Compensating voidLabel — if we purchased a label and the transaction
    // failed, try to void it so we don't leave orphan tracking numbers at the
    // carrier. Best-effort: log on failure, don't shadow the original error.
    if (labelResult) {
      try {
        const carrierObj = getCarrier(payload.carrier);
        if (carrierObj?.voidLabel) {
          await carrierObj.voidLabel({
            trackingNumber: labelResult.trackingNumber,
            carrierShipmentId: labelResult.carrierShipmentId,
            metadata: labelResult.metadata
          });
        } else {
          error(
            new Error(
              `Orphan tracking number ${labelResult.trackingNumber} (carrier ${payload.carrier}) — transaction failed and no voidLabel available`
            )
          );
        }
      } catch (voidErr) {
        error(voidErr);
      }
    }
    throw e;
  }
}

const createShipmentDefault = hookable(createShipmentImpl, {});

/**
 * Back-compat wrapper for the legacy positional signature
 * `createShipment(orderUuid, carrier, trackingNumber, connection?)`. Used by
 * the existing `api/createShipment/createShipment.ts` HTTP handler until A4
 * rewrites it. New code SHOULD use the object-payload form directly:
 * `createShipment(orderUuid, { items, carrier, tracking_number })`.
 *
 * The legacy form created a shipment with NO items. That's incompatible with
 * the new schema (CHECK qty > 0 on shipment_item), so we throw a clear error
 * directing callers to the new shape. A4 deletes this wrapper once the HTTP
 * handler is rewritten.
 */
async function createShipmentLegacy(
  orderUuid: string,
  carrier: string | null,
  trackingNumber: string | null,
  conn?: PoolClient
): Promise<CreateShipmentResult> {
  throw new Error(
    'createShipment now requires { items, carrier, tracking_number? }. ' +
      'The legacy (orderUuid, carrier, trackingNumber) signature is removed in A3. ' +
      'Update callers; see wiki/multi-shipment-design.md → Services.'
  );
}

/**
 * Default export accepts BOTH the new payload object and the legacy positional
 * form. We dispatch by inspecting the second arg so the rewrite can land
 * without simultaneously updating every caller in one diff.
 */
export default async function createShipment(
  orderUuid: string,
  payloadOrCarrier: CreateShipmentPayload | string | null,
  trackingNumberOrConn?: string | null | PoolClient,
  maybeConn?: PoolClient
): Promise<CreateShipmentResult> {
  if (
    payloadOrCarrier &&
    typeof payloadOrCarrier === 'object' &&
    'items' in payloadOrCarrier
  ) {
    return createShipmentDefault(
      orderUuid,
      payloadOrCarrier,
      typeof trackingNumberOrConn === 'object' && trackingNumberOrConn !== null
        ? (trackingNumberOrConn as PoolClient)
        : maybeConn
    );
  }
  return createShipmentLegacy(
    orderUuid,
    payloadOrCarrier as string | null,
    typeof trackingNumberOrConn === 'string' || trackingNumberOrConn === null
      ? (trackingNumberOrConn as string | null)
      : null,
    maybeConn
  );
}

export { createShipmentDefault as createShipmentNew };

export function hookBeforeCreateShipment(
  callback: (
    this: Record<string, never>,
    ...args: [
      orderUuid: string,
      payload: CreateShipmentPayload,
      conn?: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createShipment', callback, priority);
}

export function hookAfterCreateShipment(
  callback: (
    this: Record<string, never>,
    ...args: [
      orderUuid: string,
      payload: CreateShipmentPayload,
      conn?: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createShipment', callback, priority);
}

export function hookBeforeValidateShipmentItems(
  callback: (
    this: { order: OrderRow; payload: CreateShipmentPayload },
    ...args: [
      order: OrderRow,
      payload: CreateShipmentPayload,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('validateShipmentItems', callback, priority);
}

export function hookAfterValidateShipmentItems(
  callback: (
    this: { order: OrderRow; payload: CreateShipmentPayload },
    ...args: [
      order: OrderRow,
      payload: CreateShipmentPayload,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('validateShipmentItems', callback, priority);
}

export function hookBeforeInsertShipment(
  callback: (
    this: { order: OrderRow; payload: CreateShipmentPayload },
    ...args: [
      payload: CreateShipmentPayload,
      order: OrderRow,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertShipment', callback, priority);
}

export function hookAfterInsertShipment(
  callback: (
    this: { order: OrderRow; payload: CreateShipmentPayload },
    ...args: [
      payload: CreateShipmentPayload,
      order: OrderRow,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertShipment', callback, priority);
}

export function hookBeforeInsertShipmentItems(
  callback: (
    this: { shipment: ShipmentRow; checks: ItemCheck[] },
    ...args: [
      shipment: ShipmentRow,
      checks: ItemCheck[],
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertShipmentItems', callback, priority);
}

export function hookAfterInsertShipmentItems(
  callback: (
    this: { shipment: ShipmentRow; checks: ItemCheck[] },
    ...args: [
      shipment: ShipmentRow,
      checks: ItemCheck[],
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertShipmentItems', callback, priority);
}
