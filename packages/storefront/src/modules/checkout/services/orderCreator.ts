import {
  commit,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@storefront/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';
import type { OrderRow, InsertResultWithRow } from '../../../types/db/index.js';
import { PaymentStatus, ShipmentStatus } from '../../../types/order.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { resolveOrderStatus } from '../../oms/services/updateOrderStatus.js';
import { Cart } from './cart/Cart.js';
import { validateBeforeCreateOrder } from './orderValidator.js';

// ============================================================================
// Hook Type Exports - Import these when registering hooks for type safety
// ============================================================================

/** Context available in saveOrder hooks via 'this' */
export interface SaveOrderContext {
  cart: Cart;
}

/** Arguments passed to saveOrder function */
export type SaveOrderArgs = [cart: Cart, connection: PoolClient];

/** Context available in saveOrderItems hooks via 'this' */
export interface SaveOrderItemsContext {
  cart: Cart;
}

/** Arguments passed to saveOrderItems function */
export type SaveOrderItemsArgs = [
  cart: Cart,
  orderId: number,
  connection: PoolClient
];

/** Context available in disableCart hooks via 'this' */
export interface DisableCartContext {
  cart: Cart;
}

/** Arguments passed to disableCart function */
export type DisableCartArgs = [cartId: number, connection: PoolClient];

/** Context available in createOrderFunc hooks via 'this' */
export interface CreateOrderContext {
  cart: Cart;
}

/** Arguments passed to createOrderFunc function */
export type CreateOrderArgs = [cart: Cart];

// ============================================================================
// Order Result Type - Extends DB type with insert result
// ============================================================================

export type CreateOrderResult = InsertResultWithRow<OrderRow>;

async function disableCart(cartId: number, connection: PoolClient) {
  const cart = await update('cart')
    .given({ status: false })
    .where('cart_id', '=', cartId)
    .execute(connection);
  return cart;
}

async function saveOrder<T = CreateOrderResult>(
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
  let shipAddr;
  if (cart.getData('shipping_address_id')) {
    // Save the shipping address
    const cartShippingAddress = await select()
      .from('cart_address')
      .where('cart_address_id', '=', cart.getData('shipping_address_id'))
      .load(connection);
    delete cartShippingAddress.uuid;
    shipAddr = await insert('order_address')
      .given(cartShippingAddress)
      .execute(connection);
  }

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
      shipping_address_id: shipAddr ? shipAddr.insertId : null,
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

async function createOrderFunc<T extends CreateOrderResult>(cart: Cart) {
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
    await addOrderActivityLog(
      order.insertId,
      `Order has been created`,
      false,
      connection
    );

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
export const createOrder = async <T extends CreateOrderResult>(
  cart: Cart
): Promise<T> => {
  const order = await hookable(createOrderFunc<T>, {
    cart
  })(cart);
  return order;
};
