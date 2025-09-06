import {
  commit,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';
import { PaymentStatus, ShipmentStatus } from '../../../types/order.js';
import { resolveOrderStatus } from '../../oms/services/updateOrderStatus.js';
import { Cart } from './cart/Cart.js';
import { validateBeforeCreateOrder } from './orderValidator.js';

export interface OrderCreateResult {
  insertId: number;
  order_id: number;
  sid: string | null; // Nullable
  intergration_order_id: string | null; // Nullable
  uuid: string;
  order_number: string;
  cart_id: number;
  currency: string;
  customer_id: number;
  customer_email: string;
  customer_full_name: string;
  user_ip: string;
  user_agent: string;
  coupon: string;
  shipping_fee_excl_tax: number;
  shipping_fee_incl_tax: number;
  discount_amount: number;
  sub_total: number;
  sub_total_incl_tax: number;
  sub_total_with_discount: number;
  sub_total_with_discount_incl_tax: number;
  total_qty: number;
  total_weight: number;
  tax_amount: number;
  tax_amount_before_discount: number;
  shipping_tax_amount: number;
  shipping_note: string;
  grand_total: number;
  shipping_method: string;
  shipping_method_name: string;
  shipping_address_id: number;
  payment_method: string | null; // Nullable
  billing_address_id: number;
  shipment_status: string;
  payment_status: string;
  created_at: string; // timestamp with timezone
  updated_at: string; // timestamp with timezone
  total_tax_amount: number;
  status: string;
}

async function disableCart(cartId: number, connection: PoolClient) {
  const cart = await update('cart')
    .given({ status: false })
    .where('cart_id', '=', cartId)
    .execute(connection);
  return cart;
}

async function saveOrder<T = OrderCreateResult>(
  cart: Cart,
  connection: PoolClient
): Promise<T> {
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as ShipmentStatus[];
  const paymentStatusList = getConfig(
    'oms.order.paymentStatus',
    {}
  ) as PaymentStatus[];
  let defaultShipmentStatus;
  Object.keys(shipmentStatusList).forEach((key) => {
    if (shipmentStatusList[key].isDefault) {
      defaultShipmentStatus = key;
    }
  });

  let defaultPaymentStatus;
  Object.keys(paymentStatusList).forEach((key) => {
    if (paymentStatusList[key].isDefault) {
      defaultPaymentStatus = key;
    }
  });
  // Save the shipping address
  const cartShippingAddress = await select()
    .from('cart_address')
    .where('cart_address_id', '=', cart.getData('shipping_address_id'))
    .load(connection);
  delete cartShippingAddress.uuid;
  const shipAddr = await insert('order_address')
    .given(cartShippingAddress)
    .execute(connection);
  // Save the billing address
  const cartBillingAddress = await select()
    .from('cart_address')
    .where('cart_address_id', '=', cart.getData('billing_address_id'))
    .load(connection);
  delete cartBillingAddress.uuid;
  const billAddr = await insert('order_address')
    .given(cartBillingAddress)
    .execute(connection);

  const previous = await select('order_id')
    .from('order')
    .orderBy('order_id', 'DESC')
    .limit(0, 1)
    .execute(connection);

  const orderStatus = resolveOrderStatus(
    defaultPaymentStatus,
    defaultShipmentStatus
  );

  // Save order to DB
  const order = await insert('order')
    .given({
      ...cart.exportData(),
      uuid: uuidv4().replace(/-/g, ''),
      order_number:
        10000 + parseInt(previous[0] ? previous[0].order_id : 0, 10) + 1,
      // FIXME: Must be structured
      shipping_address_id: shipAddr.insertId,
      billing_address_id: billAddr.insertId,
      status: orderStatus,
      payment_status: defaultPaymentStatus,
      shipment_status: defaultShipmentStatus
    })
    .execute(connection);
  return order;
}

async function saveOrderItems(
  cart: Cart,
  orderId: number,
  connection: PoolClient
) {
  // Save order items
  const items = cart.getItems();
  const savedItems = await Promise.all(
    items.map(async (item) => {
      await insert('order_item')
        .given({
          ...item.export(),
          uuid: uuidv4().replace(/-/g, ''),
          order_item_order_id: orderId
        })
        .execute(connection);
    })
  );
  return savedItems;
}

async function saveOrderActivity(orderID: number, connection: PoolClient) {
  // Save order activities
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: 'Order created',
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection);
}

async function createOrderFunc<T extends OrderCreateResult>(cart: Cart) {
  // Start creating order
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);

    // Validate the cart
    const validateResult = await validateBeforeCreateOrder(cart);
    if (!validateResult.valid) {
      throw new Error(
        `Order validation failed: ${validateResult.errors.join('\r\n-- ')}`
      );
    }
    // Save order to DB
    const order = await hookable(saveOrder<T>, { cart })(cart, connection);

    // Save order items
    await hookable(saveOrderItems, { cart })(cart, order.insertId, connection);

    // Save order activity
    await hookable(saveOrderActivity, { cart })(order.insertId, connection);

    // Disable the cart
    await hookable(disableCart, { cart })(cart.getData('cart_id'), connection);

    await commit(connection);
    return order;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create a new order from the cart
 * @param cart
 * @returns {Promise<Object>} - The created order object
 * @throws {Error} - If the order creation fails due to validation errors or database issues
 */
export const createOrder = async <T extends OrderCreateResult>(
  cart: Cart
): Promise<T> => {
  const order = await hookable(createOrderFunc<T>, {
    cart
  })(cart);
  return order;
};
