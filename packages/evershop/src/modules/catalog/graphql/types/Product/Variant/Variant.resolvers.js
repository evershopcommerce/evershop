const { select } = require('@evershop/postgres-query-builder');
const uniqid = require('uniqid');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

module.exports = {
  Product: {
    variantGroup: async (product, _, { pool, user }) => {
      const { variantGroupId } = product;
      if (!variantGroupId) {
        return null;
      } else {
        const group = await select()
          .from('variant_group')
          .select('uuid')
          .select('attribute_one')
          .select('attribute_two')
          .select('attribute_three')
          .select('attribute_four')
          .select('attribute_five')
          .where('variant_group_id', '=', variantGroupId)
          .load(pool);

        const variants = [];
        const query = select();
        query
          .from('product')
          .select('product.product_id')
          .select('attribute.attribute_id')
          .select('attribute.attribute_code')
          .select('attribute.attribute_name')
          .select('product_attribute_value_index.option_id')
          .select('product_attribute_value_index.option_text');

        query
          .innerJoin('product_attribute_value_index')
          .on(
            'product.product_id',
            '=',
            'product_attribute_value_index.product_id'
          );
        query
          .innerJoin('attribute')
          .on(
            'product_attribute_value_index.attribute_id',
            '=',
            'attribute.attribute_id'
          );

        query.where('variant_group_id', '=', variantGroupId).and(
          'attribute.attribute_id',
          'IN',
          Object.values(group).filter((v) => Number.isInteger(v))
        );
        if (!user) {
          query.andWhere('status', '=', 1);
        }
        const vs = await query.execute(pool);
        // Filter the vs array, make sure that each product has all the attributes
        // that are in the variant group.
        let filteredVs;
        if (!user) {
          filteredVs = vs.filter((v) => {
            const attributes = Object.values(group).filter((attr) =>
              Number.isInteger(attr)
            );
            const productAttributes = vs
              .filter((p) => p.product_id === v.product_id)
              .map((p) => p.attribute_id);
            return attributes.every((a) => productAttributes.includes(a));
          });
        } else {
          filteredVs = vs;
        }

        let attributes = await select()
          .from('attribute')
          .where(
            'attribute_id',
            'IN',
            Object.values(group).filter((v) => Number.isInteger(v))
          )
          .execute(pool);

        attributes = attributes.map((a) => ({
          attributeId: a.attribute_id,
          attributeCode: a.attribute_code,
          attributeName: a.attribute_name
        }));

        const promises = attributes.map(async (attribute) => {
          const options = await select()
            .from('attribute_option')
            .where('attribute_id', '=', attribute.attributeId)
            .execute(pool);

          // eslint-disable-next-line no-param-reassign
          attribute.options = options.map((o) => {
            // Check if the option is used in a variant
            const used = filteredVs.find(
              (v) =>
                parseInt(v.option_id, 10) ===
                parseInt(o.attribute_option_id, 10)
            );
            if (!used) {
              return {
                optionId: o.attribute_option_id,
                optionText: o.option_text
              };
            } else {
              return {
                optionId: o.attribute_option_id,
                optionText: o.option_text,
                productId: used.product_id
              };
            }
          });
          return attribute;
        });

        attributes = await Promise.all(promises);

        for (let i = 0, len = filteredVs.length; i < len; i += 1) {
          const ind = variants.findIndex(
            (v) => v.productId === filteredVs[i].product_id
          );
          if (ind !== -1) {
            if (!variants[ind].attributes) {
              variants[ind].attributes = [];
            }
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
          items: variants.map((v) => ({ ...v, id: `id${uniqid()}` })),
          addItemApi: buildUrl('addVariantItem', { id: group.uuid })
        };
      }
    }
  },
  Variant: {
    product: async ({ productId }, _, { pool }) => {
      const query = select().from('product');
      query
        .leftJoin('product_description')
        .on(
          'product_description.product_description_product_id',
          '=',
          'product.product_id'
        );
      query
        .innerJoin('product_inventory')
        .on(
          'product_inventory.product_inventory_product_id',
          '=',
          'product.product_id'
        );
      query.where('product_id', '=', productId);
      const result = await query.load(pool);
      if (!result) {
        return null;
      } else {
        return camelCase(result);
      }
    }
  }
};
