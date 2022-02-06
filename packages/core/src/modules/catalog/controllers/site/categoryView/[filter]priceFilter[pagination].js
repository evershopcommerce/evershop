const { get } = require('../../../../../lib/util/get');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  try {
    // If there is no filter, do nothing
    if (!request.query || !request.query.price) {
      return next();
    }
    const priceQuery = request.query.price.split('-');

    // Invalid query
    if (priceQuery.length !== 2) { return next(); }

    // Wait for filterable attributes to be collected
    await stack.filter;

    // Get price range
    const range = get(response.context, 'productsFilter.price', {});

    // Get the product query instance
    const query = await stack.productsQueryInit;

    // `From` query
    let from = parseFloat(priceQuery[0]);
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(from) === false && from > parseFloat(range.min)) {
      query.andWhere('product.`price`', '>=', from);
    } else {
      from = '';
    }

    // `To` query
    let to = parseFloat(priceQuery[1]);
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(to) === false && to < parseFloat(range.max)) {
      query.andWhere('product.`price`', '<=', to);
    } else {
      to = '';
    }
    if (from || to) { assign(response.context, { activeProductsFilters: [{ key: 'price', value: `${from}-${to}` }] }); }

    return next();
  } catch (e) {
    return next(e);
  }
};
