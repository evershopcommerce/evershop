const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { productsFilters } = require('../../../services/productsFilter');

module.exports = async (request, response, stack) => {
  // Clone the query object, do not mutate the main one
  const query = (await stack.productsQueryInit).clone();

  query.orderBy('price', 'ASC');

  // Get the list of product before applying pagination, sorting...etc
  // Base on this list, we will find all attribute,
  // category and price can be appeared in the filter table
  const allProducts = await query.execute(pool);

  assign(response.context, {
    productsFilter: JSON.parse(JSON.stringify(
      await productsFilters(allProducts.map((p) => p.product_id))
    ))
  });
};
