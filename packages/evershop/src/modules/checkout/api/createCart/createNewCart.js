const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { saveCart } = require('../../services/saveCart');
const { Cart } = require('../../services/cart/Cart');

module.exports = async (request, response, delegate, next) => {
  try {
    const { items, customer_full_name, customer_email } = request.body;
    const cartData = {
      currency: getConfig('shop.currency', 'USD')
    };
    if (customer_full_name) {
      cartData.customer_full_name = customer_full_name;
    }
    if (customer_email) {
      cartData.customer_email = customer_email;
    }
    const cart = new Cart(cartData);
    // Check if items is not an empty array
    if (items.length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('Requires at least one item to create a cart')
        }
      });
      return;
    }
    // Maximum 100 items per cart
    if (items.length > 100) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('Too many items requested')
        }
      });
      return;
    }

    // Loop through the items and group by sku
    const groupedItems = items.reduce(
      (acc, item) => {
        if (acc.find((i) => i.sku === item.sku)) {
          acc.find((i) => i.sku === item.sku).qty += item.qty;
        } else {
          acc.push(item);
        }
        return acc;
      },
      [{ sku: items[0].sku, qty: 0 }]
    );
    const products = await select()
      .from('product')
      .where(
        'sku',
        'IN',
        groupedItems.map((item) => item.sku)
      )
      .and('status', '=', 1)
      .execute(pool);
    // Check if all products are available
    if (products.length !== groupedItems.length) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('Some products are not available')
        }
      });
      return;
    }
    // Map the grouped items to include product_id
    products.forEach((product) => {
      const item = groupedItems.find((i) => i.sku === product.sku);
      item.product_id = product.product_id;
    });
    // Loop through the grouped items and add them to the cart
    const cartItems = await Promise.all(
      groupedItems.map(async (item) => {
        const cartItem = await cart.addItem(item.product_id, item.qty);
        return cartItem;
      })
    );
    await saveCart(cart);
    // Set the new cart id to the context, so next middleware can use it
    setContextValue(request, 'cartId', cart.getData('uuid'));
    response.status(OK);
    response.$body = {
      data: {
        items: cartItems.map((item) => item.export()),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
