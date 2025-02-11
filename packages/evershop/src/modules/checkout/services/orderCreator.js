const {
  commit,
  getConnection,
  insert,
  rollback,
  select,
  startTransaction,
  update
} = require('@evershop/postgres-query-builder');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');
const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { resolveOrderStatus } = require('../../oms/services/updateOrderStatus');

/* Default validation rules */
const validationServices = [
  {
    id: 'checkCartError',
    /**
     *
     * @param {Cart} cart
     * @param {*} validationErrors
     * @returns
     */
    func: (cart, validationErrors) => {
      if (cart.hasError()) {
        validationErrors.push(cart.error);
        return false;
      } else {
        return true;
      }
    }
  },
  {
    id: 'checkEmpty',
    /**
     *
     * @param {Cart} cart
     * @param {*} validationErrors
     * @returns
     */
    func: (cart, validationErrors) => {
      const items = cart.getItems();
      if (items.length === 0) {
        validationErrors.push('Cart is empty');
        return false;
      } else {
        return true;
      }
    }
  },
  {
    id: 'shippingAddress',
    /**
     *
     * @param {Cart} cart
     * @param {*} validationErrors
     * @returns
     */
    func: (cart, validationErrors) => {
      if (!cart.getData('shipping_address_id')) {
        validationErrors.push('Please provide a shipping address');
        return false;
      } else {
        return true;
      }
    }
  },
  {
    id: 'shippingMethod',
    /**
     *
     * @param {Cart} cart
     * @param {*} validationErrors
     * @returns
     */
    func: (cart, validationErrors) => {
      if (!cart.getData('shipping_method')) {
        validationErrors.push('Please provide a shipping method');
        return false;
      } else {
        return true;
      }
    }
  }
];

const validationErrors = [];

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

async function disableCart(cartId, connection) {
  const cart = await update('cart')
    .given({ status: 0 })
    .where('cart_id', '=', cartId)
    .execute(connection);
  return cart;
}

async function saveOrder(cart, connection) {
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});
  let defaultShipmentStatus = null;
  Object.keys(shipmentStatusList).forEach((key) => {
    if (shipmentStatusList[key].isDefault) {
      defaultShipmentStatus = key;
    }
  });

  let defaultPaymentStatus = null;
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

async function saveOrderItems(cart, order, connection) {
  // Save order items
  const items = cart.getItems();
  const savedItems = await Promise.all(
    items.map(async (item) => {
      await insert('order_item')
        .given({
          ...item.export(),
          uuid: uuidv4().replace(/-/g, ''),
          order_item_order_id: order.insertId
        })
        .execute(connection);
    })
  );
  return savedItems;
}

async function saveOrderActivity(orderID, connection) {
  // Save order activities
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: 'Order created',
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection);
}

async function createOrder(cart) {
  // Start creating order
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    const validators = getValueSync(
      'createOrderValidationRules',
      validationServices
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const rule of validators) {
      // eslint-disable-next-line no-await-in-loop
      if ((await rule.func(cart, validationErrors)) === false) {
        throw new Error(validationErrors);
      }
    }

    // Save order to DB
    const order = await hookable(saveOrder, { cart })(cart, connection);

    // Save order items
    await hookable(saveOrderItems, { cart })(cart, order, connection);

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

exports.createOrder = async (cart) => {
  const order = await hookable(createOrder, {
    cart
  })(cart);
  return order;
};
