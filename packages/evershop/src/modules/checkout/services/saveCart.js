const {
  startTransaction,
  del,
  commit,
  update,
  insert,
  rollback,
  select
} = require('@evershop/postgres-query-builder');
const {
  pool,
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');

module.exports = exports;

/**
 * @param {Cart} cart
 * @returns {Promise<Number|null>}
 * @throws {Error}
 * */
exports.saveCart = async (cart) => {
  const connection = await getConnection(pool);
  await startTransaction(connection);
  try {
    const items = cart.getItems();
    let cartId;
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
      if (cart.getData('cart_id')) {
        await update('cart')
          .given(cart.exportData())
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection, false);
        cartId = cart.getData('cart_id');
      } else {
        const c = await insert('cart')
          .given(cart.exportData())
          .execute(connection, false);
        cartId = c.insertId;
      }

      // Get current items from database
      const currentItems = await select()
        .from('cart_item')
        .where('cart_id', '=', cartId)
        .execute(connection, false);

      // Delete items that are not in cart
      await Promise.all(
        currentItems.map(async (i) => {
          if (!cart.getItem(i.uuid)) {
            await del('cart_item')
              .where('cart_item_id', '=', i.cart_item_id)
              .execute(connection, false);
          }
        })
      );

      await Promise.all(
        items.map(async (item) => {
          if (/^\d+$/.test(item.getData('cart_item_id'))) {
            await update('cart_item')
              .given(item.export())
              .where('cart_item_id', '=', item.getData('cart_item_id'))
              .execute(connection, false);
          } else {
            await insert('cart_item')
              .given({
                ...item.export(),
                cart_id: cart.getData('cart_id') || cartId
              })
              .execute(connection, false);
          }
        })
      );

      await commit(connection);
      return cartId;
    }
  } catch (error) {
    await rollback(connection);
    throw error;
  }
};
