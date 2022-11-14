const {
  getConnection, commit, rollback, startTransaction, del, insert, update
} = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { get } = require('../../../../../lib/util/get');
const { getContextValue } = require('../../../../graphql/services/contextHelper');
const { CartFactory } = require('../../../services/cart/CartFactory');

module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection(pool);
  await startTransaction(connection);
  try {
    const sid = get(getContextValue(request, 'tokenPayload'), 'sid');
    const cart = await CartFactory.getCart(sid);
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
      next();
    } else {
      if (cart.getData('cart_id')) {
        await update('cart')
          .given(cart.export())
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection, false);
        cartId = cart.getData('cart_id');
      } else {
        const c = await insert('cart')
          .given(cart.export())
          .execute(connection, false);
        cartId = c.insertId;
      }

      await Promise.all(items.map(async (item) => {
        if (/^\d+$/.test(item.getData('cart_item_id'))) {
          await update('cart_item')
            .given(item.export())
            .where('cart_item_id', '=', item.getData('cart_item_id'))
            .execute(connection, false);
        } else {
          await insert('cart_item')
            .given({ ...item.export(), cart_id: cart.getData('cart_id') || cartId })
            .execute(connection, false);
        }
      }));

      await commit(connection);
      next();
    }
  } catch (error) {
    await rollback(connection);
    next(error);
  }
};
