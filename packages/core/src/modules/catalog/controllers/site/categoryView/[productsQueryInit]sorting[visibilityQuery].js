const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  try {
    const sortBy = ['price', 'name'].includes(request.query.sortBy) ? request.query.sortBy : undefined;
    const sortOrder = ['asc', 'desc'].includes(request.query.sortOrder) ? request.query.sortOrder : 'asc';

    const query = await stack.productsQueryInit;

    if (sortBy === 'price') {
      query.orderBy('product.`price`', sortOrder);
    } else if (sortBy === 'name') {
      query.orderBy('product_description.`name`', sortOrder);
    } else {
      query.orderBy('product.`product_id`', sortOrder);
    }

    assign(response.context, {
      sortBy, sortOrder
    });
    next();
  } catch (e) {
    next(e);
  }
};
