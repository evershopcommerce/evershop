const { select } = require("@evershop/mysql-query-builder");

module.exports = {
  Product: {
    variants: async (product, _, { pool }) => {
      const variantGroupId = product.variantGroupId;
      if (!variantGroupId) {
        return [];
      } else {
        const group = await select()
          .from('variant_group')
          .select('attribute_one')
          .select('attribute_two')
          .select('attribute_three')
          .select('attribute_four')
          .select('attribute_five')
          .where('variant_group_id', '=', variantGroupId)
          .load(pool);

        const attributes = [];
        const variants = [];
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

        const vs = await query.where('variant_group_id', '=', variantGroupId)
          .and('status', '=', 1)
          .and('attribute.attribute_id', 'IN', Object.values(group).filter((v) => v != null))
          .execute(pool);

        for (let i = 0, len = vs.length; i < len; i += 1) {
          const index = attributes.findIndex((v) => v.attributeId === vs[i].attribute_id);
          if (index !== -1) {
            if (!attributes[index].options) {
              attributes[index].options = [];
            }
            attributes[index].options.push({
              optionId: vs[i].option_id,
              optionText: vs[i].option_text,
              productId: vs[i].product_id
            });
          } else {
            attributes.push({
              attributeId: vs[i].attribute_id,
              attributeCode: vs[i].attribute_code,
              attributeName: vs[i].attribute_name,
              options: [
                {
                  optionId: vs[i].option_id,
                  optionText: vs[i].option_text,
                  productId: vs[i].product_id
                }
              ]
            });
          }

          const ind = variants.findIndex((v) => v.product_id === vs[i].product_id);
          if (ind !== -1) {
            if (!variants[ind].attributes) { variants[ind].attributes = []; }
            variants[ind].attributes.push({
              attributeCode: vs[i].attribute_code,
              attributeId: vs[i].attribute_id,
              optionId: vs[i].option_id,
              optionText: vs[i].option_text
            });
          } else {
            variants.push({
              product_id: vs[i].product_id,
              attributes: [
                {
                  attributeCode: vs[i].attribute_code,
                  attributeId: vs[i].attribute_id,
                  optionId: vs[i].option_id,
                  optionText: vs[i].option_text
                }
              ]
            });
          }
        }

        return {
          variantAttributes: attributes,
          items: variants
        };
      }
    }
  }
};