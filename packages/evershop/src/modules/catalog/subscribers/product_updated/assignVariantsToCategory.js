const { error } = require('@evershop/evershop/src/lib/log/debuger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { update, select } = require('@evershop/postgres-query-builder');

module.exports = async function assignVariantsToCategory(data) {
  try {
    const categoryId = data.category_id || null;
    const variantGroupId = data.variant_group_id;
    if (variantGroupId) {
      const variants = await select()
        .from('product')
        .where('variant_group_id', '=', variantGroupId)
        .andWhere('category_id', '<>', categoryId)
        .or('category_id', categoryId ? 'IS NULL' : 'IS NOT NULL', null)
        .execute(pool);
      if (variants.length > 0) {
        await update('product')
          .given({ category_id: categoryId })
          .where(
            'product_id',
            'IN',
            variants.map((variant) => variant.product_id)
          )
          .execute(pool);
      }
    }
  } catch (err) {
    error(err);
  }
};
