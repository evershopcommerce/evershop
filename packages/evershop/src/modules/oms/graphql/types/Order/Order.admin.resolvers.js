import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getPaymentMethodFactory } from '../../../../checkout/services/getAvailablePaymentMethods.js';
import { getOrdersBaseQuery } from '../../../services/getOrdersBaseQuery.js';
import { OrderCollection } from '../../../services/OrderCollection.js';

export default {
  Query: {
    orders: async (_, { filters = [] }) => {
      const query = getOrdersBaseQuery();
      const root = new OrderCollection(query);
      await root.init(filters);
      return root;
    }
  },
  Order: {
    editUrl: ({ uuid }) => buildUrl('orderEdit', { id: uuid }),
    createShipmentApi: ({ uuid }) => buildUrl('createShipment', { id: uuid }),
    cancelApi: ({ uuid }) => buildUrl('cancelOrder', { id: uuid }),
    refundApi: ({ uuid }) => buildUrl('createOrderRefund', { id: uuid }),
    // The admin refund button is shown automatically when this is true. Two
    // gates, both required: capability (the method registered a `refund`
    // handler) AND state (the payment status is flagged `isRefundable`). This
    // mirrors exactly what `refundOrder` enforces server-side, so the button is
    // never shown for an action the core route would reject.
    canRefund: async (order) => {
      if (!order.paymentMethod) {
        return false;
      }
      const factory = await getPaymentMethodFactory(order.paymentMethod);
      if (!factory?.refund) {
        return false;
      }
      const statuses = getConfig('oms.order.paymentStatus', {});
      return Boolean(statuses[order.paymentStatus]?.isRefundable);
    },
    captureApi: ({ uuid }) => buildUrl('captureOrder', { id: uuid }),
    // Shown automatically when true: capability (a registered `capture` handler)
    // AND state (the payment status is flagged `isCapturable`). Mirrors what
    // `captureOrder` enforces server-side.
    canCapture: async (order) => {
      if (!order.paymentMethod) {
        return false;
      }
      const factory = await getPaymentMethodFactory(order.paymentMethod);
      if (!factory?.capture) {
        return false;
      }
      const statuses = getConfig('oms.order.paymentStatus', {});
      return Boolean(statuses[order.paymentStatus]?.isCapturable);
    },
    metaData: (order) => order.metaData ?? {},
    updateMetafieldsApi: ({ uuid }) =>
      buildUrl('updateOrderMetafields', { id: uuid }),
    customerUrl: async ({ customerId }, _, { pool }) => {
      const customer = await select()
        .from('customer')
        .where('customer_id', '=', customerId)
        .load(pool);
      return customer ? buildUrl('customerEdit', { id: customer.uuid }) : null;
    },
    unshippedItems: async ({ orderId }, _, { pool }) => {
      const { getUnshippedItems } = await import(
        '../../../services/shipment/reads.js'
      );
      const items = await getUnshippedItems(orderId, pool);
      return items
        .filter((i) => i.qty_unshipped > 0)
        .map((i) => ({
          uuid: i.uuid,
          orderItemId: i.order_item_id,
          productSku: i.product_sku,
          productName: i.product_name,
          qtyOrdered: Number(i.qty_ordered),
          qtyUnshipped: Number(i.qty_unshipped)
        }));
    }
  },
  Shipment: {
    // Per-shipment action URLs. `PATCH /api/shipments/:uuid` (carrier /
    // tracking edits) has no resolver — admin code constructs that URL
    // inline from `shipment.uuid` (the path pattern is part of the public
    // REST contract). Same applies to extensions that need to drive shipment
    // edits programmatically.
    markDeliveredApi: ({ uuid }) =>
      buildUrl('markShipmentDelivered', { shipment_uuid: uuid }),
    cancelShipmentApi: ({ uuid }) =>
      buildUrl('cancelShipment', { shipment_uuid: uuid }),
    voidShipmentLabelApi: ({ uuid }) =>
      buildUrl('voidShipmentLabel', { shipment_uuid: uuid })
  }
};
