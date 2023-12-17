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

/* Default validation rules */
let validationServices = [
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
// eslint-disable-next-line no-unused-vars
exports.createOrder = async function createOrder(cart) {
  // Start creating order
  const connection = await getConnection(pool);
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});
  try {
    await startTransaction(connection);

    // eslint-disable-next-line no-restricted-syntax
    for (const rule of validationServices) {
      // eslint-disable-next-line no-await-in-loop
      if ((await rule.func(cart, validationErrors)) === false) {
        throw new Error(validationErrors);
      }
    }

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
    // Save order to DB
    const previous = await select('order_id')
      .from('order')
      .orderBy('order_id', 'DESC')
      .limit(0, 1)
      .execute(pool);

    // Get the default shipment status
    // Loop the shipmentStatusList object and find the one has isDefault = true
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

    const order = await insert('order')
      .given({
        ...cart.exportData(),
        uuid: uuidv4().replace(/-/g, ''),
        order_number:
          10000 + parseInt(previous[0] ? previous[0].order_id : 0, 10) + 1,
        // FIXME: Must be structured
        shipping_address_id: shipAddr.insertId,
        billing_address_id: billAddr.insertId,
        payment_status: defaultPaymentStatus,
        shipment_status: defaultShipmentStatus
      })
      .execute(connection);

    // Save order items
    const items = cart.getItems();
    await Promise.all(
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

    // Save order activities
    await insert('order_activity')
      .given({
        order_activity_order_id: order.insertId,
        comment: 'Order created',
        customer_notified: 0 // TODO: check config of SendGrid
      })
      .execute(connection);

    // Disable the cart
    await update('cart')
      .given({ status: 0 })
      .where('cart_id', '=', cart.getData('cart_id'))
      .execute(connection);
    // Load the created order
    const createdOrder = await select()
      .from('order')
      .where('order_id', '=', order.insertId)
      .load(connection);

    await commit(connection);
    return createdOrder.uuid;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

exports.addCreateOrderValidationRule = function addCreateOrderValidationRule(
  id,
  func
) {
  if (typeof obj !== 'function') {
    throw new Error('Validator must be a function');
  }

  validationServices.push({ id, func });
};

exports.removeCreateOrderValidationRule =
  function removeCreateOrderValidationRule(id) {
    validationServices = validationServices.filter((r) => r.id !== id);
  };
