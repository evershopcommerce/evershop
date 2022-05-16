const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { get } = require('../../../../../lib/util/get');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  try {
    // If there is no filter, do nothing
    if (!request.query || request.query.length === 0) {
      return next();
    }

    // Wait for filterable attributes to be collected
    await stack.filter;

    // Get the product query instance
    const query = await stack.productsQueryInit;

    const attributeIndexQuery = select();
    attributeIndexQuery.select('product_id').from('product_attribute_value_index');

    // Get the list of filterable attributes
    const filterableAttributes = get(response.context, 'productsFilter.attributes', []);
    const activeAttributes = [];
    let count = 0;
    for (let i = 0; i < filterableAttributes.length; i += 1) {
      const attribute = filterableAttributes[i];
      const q = request.query[attribute.attribute_code];
      if (Array.isArray(q)) {
        // eslint-disable-next-line use-isnan
        const fq = q.filter((j) => parseInt(j, 10) !== NaN);
        if (fq) {
          count += 1;
          attributeIndexQuery.orWhere('attribute_id', '=', attribute.attribute_id).and('option_id', 'IN', fq);
          for (let k = 0; k < fq.length; k += 1) {
            activeAttributes.push({ key: attribute.attribute_code, value: fq[k] });
          }
        }
        // eslint-disable-next-line no-restricted-globals
      } else if (isNaN(parseInt(q, 10)) === false) {
        count += 1;
        attributeIndexQuery.orWhere('attribute_id', '=', attribute.attribute_id).and('option_id', '=', parseInt(q, 10));
        activeAttributes.push({ key: attribute.attribute_code, value: q });
      } else {
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // If there is no attribute filter, do nothing
    if (attributeIndexQuery.getWhere().isEmpty()) {
      return next();
    }

    attributeIndexQuery
      .select('COUNT(`product_id`)', 'count')
      .groupBy('product_id')
      .having('count', '>=', count);
    const productIds = (await attributeIndexQuery.execute(pool)).map((p) => p.product_id);
    if (productIds.length > 0) { query.andWhere('product_id', 'IN', productIds); } else { query.andWhere('product_id', '=', 0); } // Just a dirty code for no product found

    assign(response.context, { activeProductsFilters: activeAttributes });
    return next();
  } catch (e) {
    return next(e);
  }
};
