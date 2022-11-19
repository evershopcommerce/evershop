const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../../lib/util/camelCase");
const uniqid = require('uniqid');

module.exports = {
  Product: {
    variantGroup: async (product, _, { pool, tokenPayload }) => {
      const variantGroupId = product.variantGroupId;
      if (!variantGroupId) {
        return null;
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

        // Filter the vs array, make sure that each product has all the attributes
        // that are in the variant group.
        let filteredVs;
        if (!tokenPayload.user?.isAdmin) {
          filteredVs = vs.filter((v) => {
            const attributes = Object.values(group).filter((v) => v != null);
            const productAttributes = vs.filter((p) => p.product_id === v.product_id).map((p) => p.attribute_id);
            return attributes.every((a) => productAttributes.includes(a));
          });
        } else {
          filteredVs = vs;
        }

        for (let i = 0, len = filteredVs.length; i < len; i += 1) {
          const index = attributes.findIndex((v) => v.attributeId === filteredVs[i].attribute_id);
          if (index !== -1) {
            if (!attributes[index].options) {
              attributes[index].options = [];
            }
            attributes[index].options.push({
              optionId: filteredVs[i].option_id,
              optionText: filteredVs[i].option_text,
              productId: filteredVs[i].product_id
            });
          } else {
            attributes.push({
              attributeId: filteredVs[i].attribute_id,
              attributeCode: filteredVs[i].attribute_code,
              attributeName: filteredVs[i].attribute_name,
              options: [
                {
                  optionId: filteredVs[i].option_id,
                  optionText: filteredVs[i].option_text,
                  productId: filteredVs[i].product_id
                }
              ]
            });
          }

          const ind = variants.findIndex((v) => v.productId === filteredVs[i].product_id);
          if (ind !== -1) {
            if (!variants[ind].attributes) { variants[ind].attributes = []; }
            variants[ind].attributes.push({
              attributeCode: filteredVs[i].attribute_code,
              attributeId: filteredVs[i].attribute_id,
              optionId: filteredVs[i].option_id,
              optionText: filteredVs[i].option_text
            });
          } else {
            variants.push({
              productId: filteredVs[i].product_id,
              attributes: [
                {
                  attributeCode: filteredVs[i].attribute_code,
                  attributeId: filteredVs[i].attribute_id,
                  optionId: filteredVs[i].option_id,
                  optionText: filteredVs[i].option_text
                }
              ]
            });
          }
        }

        return {
          variantGroupId,
          variantAttributes: attributes,
          items: variants.map(v => {
            return { ...v, id: `id${uniqid()}` }
          })
        };
      }
    }
  },
  Variant: {
    product: async ({ productId }, _, { pool }) => {
      const query = select()
        .from('product');
      query.leftJoin('product_description').on('product_description.`product_description_product_id`', '=', 'product.`product_id`')
      query.where('product_id', '=', productId)
      const result = await query.load(pool);
      if (!result) {
        return null
      } else {
        return camelCase(result);
      }
    }
  }
};