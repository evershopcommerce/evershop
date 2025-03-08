const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const {
  buildFilterFromUrl
} = require('@evershop/evershop/src/lib/util/buildFilterFromUrl');
const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    setContextValue(request, 'pageInfo', {
      title: 'Inventory Management',
      description: 'Inventory Management'
    });
    setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
    const query = select();
    query.from('product');
    query.andWhere('product.uuid', '=', request.params.id);
    const product = await query.load(pool);

    if (product === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'productId', product.product_id);
      setContextValue(request, 'productUuid', product.uuid);
      setContextValue(request, 'productType', product.product_type);
      next();
    }
  } catch (e) {
    next(e);
  }
};
