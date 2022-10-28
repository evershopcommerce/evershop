const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getContextValue, setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, stack, next) => {
  const id = request.query.orderId;
  const { customerId, sid } = getContextValue(request, 'tokenPayload', {});
  const query = select()
    .from('order');
  query.where('order_id', '=', id)
  query.andWhere('customer_id', '=', customerId)
    .or('sid', '=', sid);
  const order = await query.load(pool);
  if (!order) {
    response.redirect(302, buildUrl('homepage'));
  } else {
    setContextValue(request, 'orderId', parseInt(id));
    setContextValue(request, 'pageInfo', {
      title: 'Checkout success',
      description: 'Checkout success'
    });
    next();
  }
};
