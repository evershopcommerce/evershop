/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const {
  insert,
  del,
  select,
  update
} = require('@evershop/postgres-query-builder');
const { merge } = require('@evershop/evershop/src/lib/util/merge');

async function saveOptionValues(optionId, values, connection) {
  if (!values || values === 0) {
    await del('product_custom_option_value')
      .where('option_id', '=', optionId)
      .execute(connection);
    return;
  }

  // Delete all old option values
  await del('product_custom_option_value')
    .where('option_id', '=', optionId)
    .andWhere('product_custom_option_value_id', 'NOT IN', Object.keys(values))
    .execute(connection);
  // Get all remaining option values for comparison
  const optionValues = await select('product_custom_option_value_id')
    .from('product_custom_option_value')
    .where('option_id', '=', optionId)
    .execute(connection);

  for (const id in values) {
    if (
      optionValues.find(
        (v) =>
          parseInt(v.product_custom_option_value_id, 10) === parseInt(id, 10)
      )
    ) {
      await update('product_custom_option_value')
        .given(merge(values[id], { sort_order: 0 }))
        .where('product_custom_option_value_id', '=', id)
        .execute(connection);
    } else {
      await insert('product_custom_option_value')
        .given(merge(values[id], { sort_order: 0 }))
        .prime('option_id', optionId)
        .execute(connection);
    }
  }
}

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const options = request.body.options || [];
  if (!options.length === 0) {
    return;
  }
  // Delete all removed options
  await del('product_custom_option')
    .where('product_custom_option_product_id', '=', productId)
    .and(
      'product_custom_option_id',
      'NOT IN',
      options.map((o) => o.option_id)
    )
    .execute(connection);

  // Get all remaining options for comparison
  const currentOptions = await select('product_custom_option_id')
    .from('product_custom_option')
    .where('product_custom_option_product_id', '=', productId)
    .execute(connection);

  // eslint-disable-next-line no-restricted-syntax
  // eslint-disable-next-line guard-for-in
  for (let i = 0; i < options.length; i += 1) {
    const option = options[i];
    let result;
    if (
      currentOptions.find(
        (o) =>
          parseInt(o.product_custom_option_id, 10) ===
          parseInt(option.option_id, 10)
      )
    ) {
      result = await update('product_custom_option')
        .given({
          ...option,
          is_required: option.is_required || 0
        })
        .where('product_custom_option_id', '=', option.option_id)
        .execute(connection);
    } else {
      result = await insert('product_custom_option')
        .given({
          ...option,
          is_required: option.is_required || 0
        })
        .prime('product_custom_option_product_id', productId)
        .execute(connection);
    }
    await saveOptionValues(
      parseInt(result.insertId || option.option_id, 10),
      option.values || [],
      connection
    );
  }
};
