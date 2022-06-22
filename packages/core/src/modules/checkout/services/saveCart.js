const { startTransaction, del, commit, update, insert, rollback } = require("@evershop/mysql-query-builder");
const { pool, getConnection } = require("../../../lib/mysql/connection");
const { assign } = require("../../../lib/util/assign");
const { Cart } = require("./cart/cart");

module.exports = exports;

/**
 * @param {Cart} cart
 * @returns {Promise<void>}
 * @throws {Error}
 **/
exports.saveCart = async (cart) => {
  const connection = await getConnection(pool);
  await startTransaction(connection);
  try {
    const items = cart.getItems();
    if (items.length === 0) {
      // Delete cart if existed
      if (cart.getData('cart_id')) {
        await del('cart')
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection);
      }
      await commit(connection);
    } else {
      if (cart.getData('cart_id')) {
        await update('cart')
          .given(cart.export())
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection);
      } else {
        const c = await insert('cart')
          .given(cart.export())
          .execute(connection);
      }

      await Promise.all(items.map(async (item) => {
        if (/^\d+$/.test(item.getData('cart_item_id'))) {
          await update('cart_item')
            .given(item.export())
            .where('cart_item_id', '=', item.getData('cart_item_id'))
            .execute(connection);
        } else {
          await insert('cart_item')
            .given({ ...item.export(), cart_id: cart.getData('cart_id') ?? c.insertId })
            .execute(connection);
        }
      }));

      await commit(connection);
    }
  } catch (error) {
    await rollback(connection);
    throw error;
  }
};
