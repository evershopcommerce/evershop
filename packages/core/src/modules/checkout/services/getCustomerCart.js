const { select, commit, update, del } = require("@evershop/mysql-query-builder");
const { pool, getConnection } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/cart");

module.exports = exports;

exports.getCustomerCart = async (customer) => {
  if (!customer) {
    return null
  }
  const { customerId, customerEmail, customerGroupId, customerFullName, sid } = customer;
  if (!customerId && !sid) {
    return null;
  };

  const query = select()
    .from('cart');
  query.where('status', '=', 1);
  if (customerId) {
    query.andWhere('customer_id', '=', customerId)
  } else {
    query.andWhere('sid', '=', sid)
  }
  const data = await query.load(pool);
  if (!data) {
    return null;
  } else {
    const connection = await getConnection();
    // Re-calculating the cart
    let cart = new Cart({ ...data });
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
      return null;
    } else {
      // Set the customer info
      await cart.setData('sid', sid);
      await cart.setData('customer_id', customerId || null);
      await cart.setData('customer_group_id', customerGroupId || null);
      await cart.setData('customer_full_name', customerFullName || null);
      if (customerEmail) {
        await cart.setData('customer_email', customerEmail || null);
      }
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
