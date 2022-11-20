const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('order')
    query.andWhere('order.`uuid`', '=', request.params.id);
    const order = await query.load(pool);

    if (order === null) {
      console.log('order not found');
      response.status(404);
      next();
    } else {
      setContextValue(request, 'orderId', order.uuid);
      setContextValue(request, 'orderCurrency', order.currency);
      setContextValue(request, 'pageInfo', {
        title: `Order #${order.order_number}`,
        description: `Order #${order.order_number}`,
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
