const { select, commit, update, del } = require("@evershop/mysql-query-builder");
const { pool, getConnection } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/cart");

module.exports = exports;

exports.getCartById = (id) => {
  const query = select()
    .from('cart');
  query.where('cart_id', '=', id);
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