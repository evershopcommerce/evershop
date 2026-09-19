import { pool } from '../../../lib/postgres/connection.js';
import { select } from '../../../lib/postgres/query.js';
import {
  OrderAddressRow,
  OrderItemRow,
  OrderRow
} from '../../../types/db/index.js';

export type OrderDetails = OrderRow & {
  items: OrderItemRow[];
  shippingAddress: OrderAddressRow | null;
  billingAddress: OrderAddressRow | null;
};

export async function loadOrderById(
  orderId: number
): Promise<OrderDetails | null> {
  const order = (await select()
    .from('order')
    .where('order_id', '=', orderId)
    .load(pool)) as OrderRow | null;
  if (!order) {
    return null;
  }
  const items = (await select()
    .from('order_item')
    .where('order_item_order_id', '=', orderId)
    .execute(pool)) as OrderItemRow[];
  const shippingAddress = (await select()
    .from('order_address')
    .where('order_address_id', '=', order.shipping_address_id)
    .load(pool)) as OrderAddressRow | null;
  const billingAddress = (await select()
    .from('order_address')
    .where('order_address_id', '=', order.billing_address_id)
    .load(pool)) as OrderAddressRow | null;
  return {
    ...order,
    items,
    shippingAddress,
    billingAddress
  };
}

export async function loadOrderByUUID(
  orderUUID: string
): Promise<OrderDetails | null> {
  const order = (await select()
    .from('order')
    .where('uuid', '=', orderUUID)
    .load(pool)) as OrderRow | null;
  if (!order) {
    return null;
  }
  const items = (await select()
    .from('order_item')
    .where('order_item_order_id', '=', order.order_id)
    .execute(pool)) as OrderItemRow[];
  const shippingAddress = (await select()
    .from('order_address')
    .where('order_address_id', '=', order.shipping_address_id)
    .load(pool)) as OrderAddressRow | null;
  const billingAddress = (await select()
    .from('order_address')
    .where('order_address_id', '=', order.billing_address_id)
    .load(pool)) as OrderAddressRow | null;
  return {
    ...order,
    items,
    shippingAddress,
    billingAddress
  };
}
