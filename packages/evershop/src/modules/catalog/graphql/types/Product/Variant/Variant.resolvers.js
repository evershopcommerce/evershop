import { select, node } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { buildUrl } from '../../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getShowOutOfStockProducts } from '../../../../services/catalogSettings.js';
import { getProductsBaseQuery } from '../../../../services/getProductsBaseQuery.js';

export default {
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
          .leftJoin('product_attribute_value_index')
          .on(
            'product.product_id',
            '=',
            'product_attribute_value_index.product_id'
          );
        query
          .innerJoin('product_inventory')
          .on(
            'product.product_id',
            '=',
            'product_inventory.product_inventory_product_id'
          );
        query
          .leftJoin('attribute')
          .on(
            'product_attribute_value_index.attribute_id',
            '=',
            'attribute.attribute_id'
          );

        if (!user && getShowOutOfStockProducts() === false) {
          // Wrap the disjunction in its own node. Chaining
          // .andWhere(...).addNode(node('OR')...) leaves the OR at the same
          // tree level as every LATER andWhere — SQL precedence then turns
          // "A OR (B AND C) AND <rest>" into "A OR (...)", so any
          // manage_stock=false product in the store bypassed the variant
          // group / attribute / status filters below.
          const stockFilter = node('AND');
          stockFilter.addLeaf(
            'AND',
            'product_inventory.manage_stock',
            '=',
            false
          );
          stockFilter.addNode(
            node('OR')
              .addLeaf('AND', 'product_inventory.qty', '>', 0)
              .addLeaf('AND', 'product_inventory.stock_availability', '=', true)
          );
          query.getWhere().addNode(stockFilter);
        }

        query.andWhere('variant_group_id', '=', variantGroupId);
        query.andWhere(
          'product_attribute_value_index.attribute_id',
          'IN',
          Object.values(group).filter((v) => Number.isInteger(v))
        );
        if (!user) {
          query.andWhere('status', '=', 1);
        }
        query.orderBy('product_attribute_value_index.option_id', 'ASC');
        const vs = await query.execute(pool);
        const attributes = await select()
          .from('attribute')
          .where(
            'attribute_id',
            'IN',
            Object.values(group).filter((v) => Number.isInteger(v))
          )
          .execute(pool);

        return {
          variantGroupId,
          variantAttributes: attributes.map((a) => {
            // We need to get all the options available from the variants list
            const options = vs
              .filter((v) => v.attribute_id === a.attribute_id)
              .map((v) => ({
                optionId: v.option_id,
                optionText: v.option_text,
                productId: v.product_id
              }));
            return {
              attributeId: a.attribute_id,
              attributeCode: a.attribute_code,
              attributeName: a.attribute_name,
              options
            };
          }),
          items: () => {
            // Group rows per product with a Map — the previous
            // find()-in-reduce was O(n²) over the variant list.
            const byProduct = new Map();
            for (const v of vs) {
              let entry = byProduct.get(v.product_id);
              if (!entry) {
                entry = { product_id: v.product_id, attributes: [] };
                byProduct.set(v.product_id, entry);
              }
              entry.attributes.push({
                attributeId: v.attribute_id,
                attributeCode: v.attribute_code,
                optionId: v.option_id,
                optionText: v.option_text
              });
            }
            return [...byProduct.values()].map((p) => {
                const productAttributes = p.attributes.map(
                  (a) => a.attributeCode
                );
                const missingAttributes = attributes
                  .filter((a) => !productAttributes.includes(a.attribute_code))
                  .map((a) => ({
                    attributeId: a.attribute_id,
                    attributeCode: a.attribute_code,
                    optionId: null,
                    optionText: null
                  }));
                return {
                  productId: p.product_id,
                  id: `id-${uniqid()}`,
                  attributes: [...p.attributes, ...missingAttributes].filter(
                    (a) => a.attributeCode
                  )
                };
              });
          },
          addItemApi: buildUrl('addVariantItem', { id: group.uuid })
        };
      }
    }
  },
  Variant: {
    product: async ({ productId }, _, { pool }) => {
      const query = getProductsBaseQuery();
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
