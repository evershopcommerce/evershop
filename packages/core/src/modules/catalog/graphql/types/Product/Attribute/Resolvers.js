const { select } = require('@evershop/mysql-query-builder');
const { camelCase } = require('../../../../../../lib/util/camelCase');

module.exports = {
  Product: {
    attributes: (product, _, { pool }) => {
      return select()
        .from('product_attribute_value_index')
        .where('product_id', '=', product.productId)
        .execute(pool).then((rows) => camelCase(rows));
    }
  }
}