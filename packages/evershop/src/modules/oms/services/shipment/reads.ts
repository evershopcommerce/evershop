import { select } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';
import { pool } from '../../../../lib/postgres/connection.js';
import type {
  ShipmentRow,
  ShipmentItemRow
} from '../../../../types/db/index.js';
import type { OrderShipmentRollup } from '../../types/orderShipmentRollup.js';
import { resolveShipmentRollupForOrder } from './resolveShipmentRollup.js';

export interface ShipmentWithItems extends ShipmentRow {
  items: ShipmentItemRow[];
}

export interface UnshippedItem {
  order_item_id: number;
  uuid: string;
  product_sku: string;
  product_name: string;
  qty_ordered: number;
  qty_unshipped: number;
}

/**
 * Resolve an order's order_id from a uuid OR numeric id input. Accepts either
 * form so callers don't have to. Returns null if not found.
 */
async function resolveOrderId(
  idOrUuid: number | string,
  connection: PoolClient | typeof pool
): Promise<number | null> {
  if (typeof idOrUuid === 'number') return idOrUuid;
  const r = await connection.query(
    `SELECT order_id FROM "order" WHERE uuid = $1 LIMIT 1`,
    [idOrUuid]
  );
  return r.rows.length ? Number((r.rows[0] as { order_id: number }).order_id) : null;
}

/**
 * Return every shipment on the order with its items embedded. Ordered by
 * `created_at ASC, shipment_id ASC` so consumers get deterministic order — the
 * deprecated singular `Order.shipment` resolver picks `[0]`.
 */
export async function getShipmentsForOrder(
  orderIdOrUuid: number | string,
  connection: PoolClient | typeof pool = pool
): Promise<ShipmentWithItems[]> {
  const orderId = await resolveOrderId(orderIdOrUuid, connection);
  if (orderId === null) return [];

  // .orderBy() lives on SelectQuery/Query, not Node — hold the query handle
  // and call .orderBy() on it separately (wiki/database.md → "What chains on what").
  const q = select().from('shipment');
  q.where('shipment_order_id', '=', orderId);
  q.orderBy('created_at', 'ASC');
  const shipments = (await q.execute(connection)) as ShipmentRow[];
  if (shipments.length === 0) return [];

  const shipmentIds = shipments.map((s) => s.shipment_id);
  const items = (await select()
    .from('shipment_item')
    .where('shipment_id', 'IN', shipmentIds)
    .execute(connection)) as ShipmentItemRow[];

  const itemsByShipment = new Map<number, ShipmentItemRow[]>();
  for (const item of items) {
    const bucket = itemsByShipment.get(item.shipment_id) ?? [];
    bucket.push(item);
    itemsByShipment.set(item.shipment_id, bucket);
  }
  return shipments.map((s) => ({
    ...s,
    items: itemsByShipment.get(s.shipment_id) ?? []
  }));
}

/**
 * Items that still have remaining qty to ship — joined against
 * non-canceled-non-pending shipment_item rows. `pending` and `canceled`
 * shipments contribute zero, so their items count as unshipped (canceled
 * shipments release their items back to the pool; pending shipments are
 * pre-pack and haven't actually shipped yet).
 *
 * Filtered to `no_shipping_required = false` so digital items NEVER appear —
 * the admin UI driving createShipment never has the chance to try shipping
 * them.
 */
export async function getUnshippedItems(
  orderIdOrUuid: number | string,
  connection: PoolClient | typeof pool = pool
): Promise<UnshippedItem[]> {
  const orderId = await resolveOrderId(orderIdOrUuid, connection);
  if (orderId === null) return [];

  // Sum shipment_item.qty per order_item only over shipped/delivered shipments
  // (pending/canceled don't count). The phase mapping lives in app config, so
  // we resolve it client-side: pass the list of "counts as shipped" statuses
  // to the SQL.
  const { getConfig } = await import('../../../../lib/util/getConfig.js');
  const list = getConfig('oms.order.shipmentStatus', {}) as unknown as Record<
    string,
    { phase: string }
  >;
  const countingStatuses = Object.entries(list)
    .filter(([, d]) => d.phase === 'shipped' || d.phase === 'delivered')
    .map(([code]) => code);

  // If no statuses count, fall back to "everything is unshipped" — the
  // statusOf-CASE below handles an empty array via the COALESCE.
  const statusListLiteral =
    countingStatuses.length === 0
      ? 'NULL'
      : countingStatuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');

  const result = await connection.query(
    `SELECT oi.order_item_id, oi.uuid, oi.product_sku, oi.product_name, oi.qty AS qty_ordered,
            oi.qty - COALESCE(SUM(CASE WHEN s.status IN (${statusListLiteral}) THEN si.qty ELSE 0 END), 0) AS qty_unshipped
       FROM order_item oi
       LEFT JOIN shipment_item si ON si.order_item_id = oi.order_item_id
       LEFT JOIN shipment s       ON s.shipment_id    = si.shipment_id
      WHERE oi.order_item_order_id = $1
        AND oi.no_shipping_required = FALSE
      GROUP BY oi.order_item_id, oi.uuid, oi.product_sku, oi.product_name, oi.qty`,
    [orderId]
  );

  return (result.rows as Array<UnshippedItem & { qty_unshipped: string | number }>).map(
    (r) => ({
      ...r,
      qty_unshipped: Number(r.qty_unshipped)
    })
  );
}

/**
 * Compute the order's rolled-up shipment status (one of the six
 * `OrderShipmentRollup` values). Pure read; same answer the cached
 * `order.shipment_status` column should hold if recomputes have kept up.
 */
export async function getOrderShipmentRollup(
  orderIdOrUuid: number | string,
  connection: PoolClient | typeof pool = pool
): Promise<OrderShipmentRollup> {
  const orderId = await resolveOrderId(orderIdOrUuid, connection);
  if (orderId === null) {
    throw new Error(`Order not found: ${orderIdOrUuid}`);
  }
  return resolveShipmentRollupForOrder(orderId, connection);
}
