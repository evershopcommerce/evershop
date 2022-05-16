const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  const query = select();
  query.from('product').leftJoin('product_description').on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
  query.where('product_id', '=', request.params.id);
  const product = await query.load(pool);
  if (product === null) {
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'error',
      message: 'Requested product does not exist'
    });
    request.session.save();
    response.redirect(302, buildUrl('productGrid'));
  } else {
    assign(response.context, { product: JSON.parse(JSON.stringify(product)) });
    assign(response.context, { page: { heading: product.name } });
    next();
  }
};
