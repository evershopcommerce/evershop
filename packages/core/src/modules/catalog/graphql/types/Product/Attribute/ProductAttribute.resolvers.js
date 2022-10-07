const { select } = require('@evershop/mysql-query-builder');
const { camelCase } = require('../../../../../../lib/util/camelCase');

module.exports = {
  Product: {
    attributeIndex: async (product, _, { pool }) => {
      return (await select()
        .from('product_attribute_value_index')
        .where('product_id', '=', product.productId)
        .execute(pool)).map((row) => camelCase(row));
    },
    attributes: async (product, _, { pool }) => {
      const valueIndex = (await select()
        .from('product_attribute_value_index')
        .where('product_id', '=', product.productId)
        .execute(pool)).map((row) => row.attribute_id);
      const attributes = await select()
        .from('attribute')
        .where('attribute_id', 'IN', valueIndex)
        .execute(pool);
      return attributes.map(a => camelCase(a))
    }
  }
}