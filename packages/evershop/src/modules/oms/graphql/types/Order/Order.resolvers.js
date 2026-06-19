import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getCarrier } from '../../../services/carrier/registry.js';
import { getOrdersBaseQuery } from '../../../services/getOrdersBaseQuery.js';
import { getPhaseOf } from '../../../services/updateShipmentStatus.js';

export default {
  Query: {
    order: async (_, { uuid }, { pool }) => {
      const query = getOrdersBaseQuery();
      query.where('uuid', '=', uuid);
      const order = await query.load(pool);
      if (!order) {
        return null;
      } else {
        return camelCase(order);
      }
    },
    /**
     * Anonymous tracking token verification status, populated by the
     * `/orders/:uuid/track` page middleware via `setContextValue`. Returns
     * `null` on any page that doesn't set it.
     */
    trackingTokenStatus: (_, __, context) =>
      context.trackingStatus ?? null
  },
  Order: {
    /**
     * Re-shape the JSONB column into the camelCase GraphQL type. Same
     * conversion as Cart.shippingMethodData. Historical orders were
     * backfilled with snake_case keys by Version-1.0.8 migration.
     */
    shippingMethodData: ({ shippingMethodData }) => {
      if (!shippingMethodData) return null;
      return {
        providerCode: shippingMethodData.provider_code,
        methodCode: shippingMethodData.method_code,
        snapshot: shippingMethodData.snapshot,
        fingerprint: shippingMethodData.fingerprint,
        quotedAt: shippingMethodData.quotedAt
      };
    },
    /** Convenience: extract method display name from the JSONB snapshot. */
    shippingMethodName: ({ shippingMethodData }) =>
      shippingMethodData?.snapshot?.name ?? null,
    items: async ({ orderId }, _, { pool }) => {
      const items = await select()
        .from('order_item')
        .where('order_item_order_id', '=', orderId)
        .execute(pool);
      return items.map((item) => camelCase(item));
    },
    shippingAddress: async ({ shippingAddressId }, _, { pool }) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', shippingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ billingAddressId }, _, { pool }) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', billingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    activities: async ({ orderId }, _, { pool }) => {
      const query = select().from('order_activity');
      query.where('order_activity_order_id', '=', orderId);
      query.orderBy('order_activity_id', 'DESC');
      const activities = await query.execute(pool);
      return activities
        ? activities.map((activity) => camelCase(activity))
        : null;
    },
    shipment: async ({ orderId, uuid }, _, { pool }) => {
      // Deprecated singular — returns the earliest shipment for back-compat
      // until Z1. Use Order.shipments instead.
      const q = select().from('shipment');
      q.where('shipment_order_id', '=', orderId);
      q.orderBy('created_at', 'ASC');
      q.orderBy('shipment_id', 'ASC');
      q.limit(0, 1);
      const rows = await q.execute(pool);
      const shipment = rows && rows[0];
      return shipment ? { ...camelCase(shipment), orderUuid: uuid } : null;
    },
    shipments: async ({ orderId, uuid }, _, { pool }) => {
      const { getShipmentsForOrder } = await import(
        '../../../services/shipment/reads.js'
      );
      const list = await getShipmentsForOrder(orderId, pool);
      // Embed `orderUuid` on each row so per-shipment resolvers (action URLs)
      // can build URLs without re-querying.
      return list.map((s) => ({ ...camelCase(s), orderUuid: uuid }));
    },
    shipmentStatus: async ({ shipmentStatus }) => {
      // `order.shipment_status` now holds a rollup output: one of `pending`,
      // `partially_shipped`, `shipped`, `partially_delivered`, `delivered`,
      // `canceled`. The first three and last two are registered in
      // `oms.order.shipmentStatus` (well, all five technically are except
      // `partially_*` which are rollup-output-only). To get a single
      // canonical name/badge for any rollup value we consult `ROLLUP_DISPLAY`,
      // overridable via `addProcessor('rollupDisplay', ...)`.
      const { getRollupDisplay } = await import(
        '../../../services/rollupDisplay.js'
      );
      const display = getRollupDisplay();
      const entry = display[shipmentStatus] || {
        name: 'Unknown',
        badge: 'default'
      };
      return {
        code: shipmentStatus,
        name: entry.name,
        badge: entry.badge
      };
    },
    paymentStatus: ({ paymentStatus }) => {
      const statusList = getConfig('oms.order.paymentStatus', {});
      const status = statusList[paymentStatus] || {
        name: 'Unknown',
        code: paymentStatus,
        badge: 'default'
      };

      return {
        ...status,
        code: paymentStatus
      };
    },
    status: ({ status }) => {
      const statusList = getConfig('oms.order.status', {});
      const statusObj = statusList[status] || {
        name: 'Unknown',
        code: status,
        badge: 'default'
      };

      return {
        ...statusObj,
        code: status
      };
    }
  },
  Customer: {
    orders: async ({ customerId }, _, { pool }) => {
      const orders = await select()
        .from('order')
        .where('order.customer_id', '=', customerId)
        .execute(pool);
      return orders.map((row) => camelCase(row));
    }
  },
  OrderItem: {
    productUrl: async ({ productId }, _, { pool }) => {
      const product = await select()
        .from('product')
        .where('product_id', '=', productId)
        .load(pool);
      return product ? buildUrl('productEdit', { id: product.uuid }) : null;
    },
    /**
     * Per-item fulfillment rollup. Sums shipment_item.qty across non-canceled
     * shipments for this order_item, split by the shipment's phase. Returns
     * one of: `digital | delivered | shipped | partial_shipped | pending`.
     *
     * Phase derivation reuses `getPhaseOf` from the registry so custom
     * extension-registered statuses (e.g. `out_for_delivery` mapped to phase
     * `shipped`) count correctly without this resolver needing to know about
     * them. Canceled-phase shipments are excluded — their qty is "uncommitted."
     */
    fulfillmentBadge: async ({ orderItemId, noShippingRequired, qty }, _, { pool }) => {
      if (noShippingRequired) return 'digital';
      const result = await pool.query(
        `SELECT s."status" AS status, si."qty" AS qty
           FROM "shipment_item" si
           JOIN "shipment" s ON s."shipment_id" = si."shipment_id"
          WHERE si."order_item_id" = $1`,
        [orderItemId]
      );
      let delivered = 0;
      let shipped = 0;
      let pending = 0;
      for (const row of result.rows) {
        let phase;
        try {
          phase = getPhaseOf(row.status);
        } catch {
          // Status no longer registered — skip rather than throw.
          continue;
        }
        if (phase === 'canceled') continue;
        const q = Number(row.qty);
        if (phase === 'delivered') delivered += q;
        else if (phase === 'shipped') shipped += q;
        else pending += q;
      }
      const committed = delivered + shipped + pending;
      const itemQty = Number(qty);
      if (delivered >= itemQty) return 'delivered';
      if (committed >= itemQty) return 'shipped';
      if (committed > 0) return 'partial_shipped';
      return 'pending';
    },
    total: ({ lineTotalInclTax }) =>
      // This field is deprecated, use lineTotalInclTax instead
      lineTotalInclTax,
    subTotal: ({ lineTotal }) =>
      // This field is deprecated, use lineTotal instead
      lineTotal,
    variantOptions: ({ variantOptions }) => {
      try {
        return JSON.parse(variantOptions || '[]').map((option) => ({
          ...camelCase(option),
          attributeId: parseInt(option.attribute_id, 10),
          optionId: parseInt(option.option_id, 10)
        }));
      } catch (error) {
        return [];
      }
    }
  },
  Shipment: {
    carrierName: ({ carrier }) => {
      const c = getCarrier(carrier);
      return c?.name ?? null;
    },
    trackingUrl: ({
      carrier,
      trackingNumber,
      carrierShipmentId,
      carrierMetadata,
      trackingUrl
    }) => {
      // Persisted carrier URL wins. Aggregators (Shippo, EasyPost) hand back
      // a real tracking page at label-purchase time as `tracking_url_provider`
      // / `public_url`; createShipment stores it on the row. They can't
      // compose it later — generateTrackingUrl is sync and has no underlying
      // carrier hint.
      if (trackingUrl) return trackingUrl;
      if (!trackingNumber) return null;
      const c = getCarrier(carrier);
      return (
        c?.generateTrackingUrl?.({
          trackingNumber,
          carrierShipmentId: carrierShipmentId ?? undefined,
          metadata: carrierMetadata ?? undefined
        }) ?? null
      );
    },
    status: ({ status }) => {
      // Per-shipment status returns the full ShipmentStatus object from the
      // registry (not the rolled-up display map — that's for order-level
      // `Order.shipmentStatus`). A shipment's status is always a registered
      // entry; the `partially_*` values never land on a shipment row.
      const list = getConfig('oms.order.shipmentStatus', {});
      const detail = list[status] || {
        name: 'Unknown',
        badge: 'default',
        phase: 'shipped'
      };
      return {
        code: status,
        name: detail.name,
        badge: detail.badge,
        phase: detail.phase
      };
    },
    phase: ({ status }) => {
      const statusList = getConfig('oms.order.shipmentStatus', {});
      return statusList[status]?.phase ?? 'shipped';
    },
    items: async ({ shipmentId, items }, _, { pool }) => {
      // Embedded by getShipmentsForOrder when available; fall back to a join
      // for direct Shipment lookups where items wasn't pre-loaded.
      const rawItems = items ?? (await select()
        .from('shipment_item')
        .where('shipment_id', '=', shipmentId)
        .execute(pool));
      if (rawItems.length === 0) return [];
      const orderItemIds = rawItems.map((i) => i.order_item_id);
      const orderItems = await select()
        .from('order_item')
        .where('order_item_id', 'IN', orderItemIds)
        .execute(pool);
      const oiByid = new Map(orderItems.map((oi) => [oi.order_item_id, oi]));
      return rawItems.map((i) => {
        const oi = oiByid.get(i.order_item_id);
        return {
          uuid: i.uuid,
          orderItemId: i.order_item_id,
          qty: i.qty,
          productSku: oi?.product_sku ?? null,
          productName: oi?.product_name ?? null,
          thumbnail: oi?.thumbnail ?? null
        };
      });
    }
  }
};
