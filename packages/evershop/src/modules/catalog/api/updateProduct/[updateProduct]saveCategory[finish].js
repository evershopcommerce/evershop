/* eslint-disable no-loop-func */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const { select, update } = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const categoryId = get(request, 'body.category_id');

  if (categoryId) {
    // Get the variant if any
    const product = await select()
      .from('product')
      .where('uuid', '=', request.params.id)
      .load(connection);

    if (product.variant_group_id) {
      const promises = [];
      const variants = await select()
        .from('product')
        .where('variant_group_id', '=', product.variant_group_id)
        .execute(connection);

      for (let i = 0; i < variants.length; i += 1) {
        promises.push(
          await update('product')
            .given({ category_id: categoryId })
            .where('variant_group_id', '=', product.variant_group_id)
            .and('product_id', '!=', productId)
            .execute(connection, false)
        );
      }
      await Promise.all(promises);
    }
  }
};
