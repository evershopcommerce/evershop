const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response) => {
  const query = select();
  query.from('product_custom_option').where('product_custom_option_product_id', '=', request.params.id);
  const results = await query.execute(pool);

  response.context.productOptions = await Promise.all(results.map(async (r) => {
    const valueQuery = select();
    valueQuery
      .from('product_custom_option_value')
      .where('option_id', '=', r.product_custom_option_id);
    const values = await valueQuery.execute(pool);
    return {
      ...r,
      option_id: r.product_custom_option_id,
      values: values.map((v) => ({ ...v, value_id: v.product_custom_option_value_id }))
    };
  }));
};
