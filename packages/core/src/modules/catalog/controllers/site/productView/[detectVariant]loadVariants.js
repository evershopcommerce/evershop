const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack, next) => {
  /** Wait for product to be fully loaded */
  await stack.detectVariant;
  const product = get(response, 'context.product');
  try {
    if (!product.variant_group_id) {
      assign(response.context.product, { variants: [] });
      next();
    } else {
      const group = await select()
        .from('variant_group')
        .select('attribute_one')
        .select('attribute_two')
        .select('attribute_three')
        .select('attribute_four')
        .select('attribute_five')
        .where('variant_group_id', '=', product.variant_group_id)
        .load(pool);

      const attributes = []; const
        variants = [];
      const query = select();
      query.from('product')
        .select('product.`product_id`')
        .select('attribute.`attribute_id`')
        .select('attribute.`attribute_code`')
        .select('attribute.`attribute_name`')
        .select('product_attribute_value_index.`option_id`')
        .select('product_attribute_value_index.`option_text`');

      query.innerJoin('product_attribute_value_index')
        .on('product.`product_id`', '=', 'product_attribute_value_index.`product_id`');
      query.innerJoin('attribute')
        .on('product_attribute_value_index.`attribute_id`', '=', 'attribute.`attribute_id`');
      const vs = await query.where('variant_group_id', '=', product.variant_group_id)
        .and('status', '=', 1)
        .and('attribute.attribute_id', 'IN', Object.values(group).filter((v) => v != null))
        .execute(pool);

      for (let i = 0, len = vs.length; i < len; i += 1) {
        const index = attributes.findIndex((v) => v.attribute_id === vs[i].attribute_id);
        if (index !== -1) {
          if (!attributes[index].options) { attributes[index].options = []; }
          attributes[index].options.push({
            option_id: vs[i].option_id,
            option_text: vs[i].option_text,
            product_id: vs[i].product_id
          });
        } else {
          attributes.push({
            attribute_id: vs[i].attribute_id,
            attribute_code: vs[i].attribute_code,
            attribute_name: vs[i].attribute_name,
            options: [
              {
                option_id: vs[i].option_id,
                option_text: vs[i].option_text,
                product_id: vs[i].product_id
              }
            ]
          });
        }

        const ind = variants.findIndex((v) => v.product_id === vs[i].product_id);
        if (ind !== -1) {
          if (!variants[ind].attributes) { variants[ind].attributes = []; }
          variants[ind].attributes.push({
            attribute_code: vs[i].attribute_code,
            attribute_id: vs[i].attribute_id,
            option_id: vs[i].option_id,
            option_text: vs[i].option_text
          });
        } else {
          variants.push({
            product_id: vs[i].product_id,
            attributes: [
              {
                attribute_code: vs[i].attribute_code,
                attribute_id: vs[i].attribute_id,
                option_id: vs[i].option_id,
                option_text: vs[i].option_text
              }
            ]
          });
        }
      }

      assign(response.context.product, { variants, variantAttributes: attributes });
      next();
    }
  } catch (e) {
    next(e);
  }
};
