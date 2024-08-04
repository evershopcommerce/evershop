const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');

module.exports = exports = {};

exports.registerCartItemVariantOptionsField = (fields) => {
  const newFields = fields.concat([
    {
      key: 'variant_options',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          if (product.variant_group_id) {
            const group = await select('attribute_one')
              .select('attribute_two')
              .select('attribute_three')
              .select('attribute_four')
              .select('attribute_five')
              .from('variant_group')
              .where('variant_group_id', '=', product.variant_group_id)
              .load(pool);
            if (!group) {
              return null;
            } else {
              const query = select('a.attribute_code')
                .select('a.attribute_name')
                .select('a.attribute_id')
                .select('o.option_id')
                .select('o.option_text')
                .from('attribute', 'a');
              query
                .innerJoin('product_attribute_value_index', 'o')
                .on('a.attribute_id', '=', 'o.attribute_id');
              query.where('o.product_id', '=', product.product_id).and(
                'a.attribute_id',
                'IN',
                Object.values(group).filter((v) => v != null)
              );

              return JSON.stringify(await query.execute(pool));
            }
          } else {
            return null;
          }
        }
      ],
      dependencies: ['variant_group_id']
    }
  ]);
  return newFields;
};
