const { select, commit, update, del, insert } = require("@evershop/mysql-query-builder");
const { pool, getConnection } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/Cart");

module.exports = exports;

/**
 * This function return a Cart object by tokenPayload. Do not use this function directly.
 * Use CartFactory.getCart() instead.
 * @param {*} tokenPayLoad : The payload of the jwt token
 * @returns {Promise<Cart>}
 */
exports.getCustomerCart = async (tokenPayLoad) => {
  const user = tokenPayLoad?.user || {};
  const sid = tokenPayLoad?.sid || null;
  // Extract the user info
  const {
    customerId: customer_id,
    email: customer_email,
    groupId: customer_group_id,
    fullName: customer_full_name
  } = user;
  const query = select()
    .from('cart');
  query.where('status', '=', 1);
  query.andWhere('sid', '=', sid);
  const data = await query.load(pool);
  if (!data) {
    return new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name });
  } else {
    const connection = await getConnection();

    // Check if user has a abadoned cart
    const abadonedCart = await select()
      .from('cart')
      .where('customer_id', '=', customer_id)
      .and('customer_id', 'IS NOT', null)
      .and('sid', '<>', sid)
      .and('status', '=', 1)
      .load(connection, false);
    if (abadonedCart) {
      // Merge carts
      const items = await select()
        .from('cart_item')
        .where('cart_id', '=', abadonedCart.cart_id)
        .execute(connection, false);

      for (const item of items) {
        await insert('cart_item')
          .given({
            ...item,
            cart_id: data.cart_id,
          })
          .execute(connection, false);
      }

      // Update the abadoned cart, set status to 0
      await update('cart')
        .given({
          status: 0,
        })
        .where('cart_id', '=', abadonedCart.cart_id)
        .execute(connection, false);
    }
    // Re-calculating the cart
    let cart = new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name, ...data });
    await cart.build();
    const items = cart.getItems();
    if (items.length === 0) {
      // Delete cart if existed
      if (cart.getData('cart_id')) {
        await del('cart')
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection, false);
      }
      await commit(connection);
      return new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name });
    } else {
      await update('cart')
        .given(cart.export())
        .where('cart_id', '=', cart.getData('cart_id'))
        .execute(connection, false);

      await Promise.all(items.map(async (item) => {
        await update('cart_item')
          .given(item.export())
          .where('cart_item_id', '=', item.getData('cart_item_id'))
          .execute(connection, false);
      }));
      await commit(connection);
      return cart;
    }
  }
}
