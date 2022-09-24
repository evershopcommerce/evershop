const {
  commit, getConnection, insert, rollback, select, startTransaction, update
} = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

/* Default validation rules */
let validationServices = [
  {
    id: 'checkEmpty',
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

  try {
    await startTransaction(connection);

    // eslint-disable-next-line no-restricted-syntax
    for (const rule of validationServices) {
      // eslint-disable-next-line no-await-in-loop
      if (await rule.func(cart, validationErrors) === false) {
        throw new Error(validationErrors);
      }
    }

    // Save the shipping address
    const shipAddr = await insert('order_address')
      .given(await select()
        .from('cart_address')
        .where('cart_address_id', '=', cart.getData('shipping_address_id'))
        .load(connection))
      .execute(connection);
    // Save the billing address
    const billAddr = await insert('order_address')
      .given(await select()
        .from('cart_address')
        .where('cart_address_id', '=', cart.getData('billing_address_id') || cart.getData('shipping_address_id'))
        .load(connection))
      .execute(connection);
    // Save order to DB
    // TODO: Maybe we should allow plugin to prepare order data before created?
    const previous = await select('order_id').from('order').orderBy('order_id', 'DESC').limit(0, 1)
      .execute(pool);

    const order = await insert('order')
      .given({
        ...cart.export(),
        order_number: 10000 + parseInt(previous[0] ? previous[0].order_id : 0, 10) + 1,
        // FIXME: Must be structured
        shipping_address_id: shipAddr.insertId,
        billing_address_id: billAddr.insertId,
        payment_status: 'pending',
        shipment_status: 'unfullfilled' // TODO: Payment and shipment status should be provided by the method
      })
      .execute(connection);

    // Save order items
    const items = cart.getItems();
    await Promise.all(items.map(async (item) => {
      await insert('order_item').given({ ...item.export(), order_item_order_id: order.insertId }).execute(connection);
    }));

    // Save order activities
    await insert('order_activity').given({
      order_activity_order_id: order.insertId,
      comment: 'Order created',
      customer_notified: 0 // TODO: check config of SendGrid
    }).execute(connection);

    // Disable the cart
    // await update('cart')
    //   .given({ status: 0 })
    //   .where('cart_id', '=', cart.getData('cart_id'))
    //   .execute(connection);

    await commit(connection);
    return order.insertId;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

exports.addCreateOrderValidationRule = function addCreateOrderValidationRule(id, func) {
  if (typeof obj !== 'function') { throw new Error('Validator must be a function'); }

  validationServices.push({ id, func });
};

exports.removeCreateOrderValidationRule = function removeCreateOrderValidationRule(id) {
  validationServices = validationServices.filter((r) => r.id !== id);
};
