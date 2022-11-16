const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, stack, next) => {
  const orderId = request.params.orderId;
  const query = select()
    .from('order');
  query.where('uuid', '=', orderId)
  const order = await query.load(pool);
  if (!order) {
    response.redirect(302, buildUrl('homepage'));
  } else {
    setContextValue(request, 'orderId', orderId);
    setContextValue(request, 'pageInfo', {
      title: 'Checkout success',
      description: 'Checkout success'
    });
    next();
  }
};
