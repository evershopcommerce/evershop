import { node, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { get } from '../../../../../lib/util/get.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query
      .from('product')
      .leftJoin('product_description')
      .on(
        'product.product_id',
        '=',
        'product_description.product_description_product_id'
      );
    query
      .innerJoin('product_inventory')
      .on(
        'product.product_id',
        '=',
        'product_inventory.product_inventory_product_id'
      );
    query.where('product.uuid', '=', request.params.uuid);
    query.andWhere('status', '=', 1);
    const product = await query.load(pool);

    if (product === null) {
      response.status(404);
      next();
    } else {
      const queries = request.query;
      if (
        !get(product, 'variant_group_id') ||
        Object.values(queries).length === 0
      ) {
        setContextValue(request, 'productId', product.product_id);
        setContextValue(request, 'pageInfo', {
          title: product.meta_title || product.name,
          description: product.meta_description || product.short_description
        });
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

        const attributes = await select()
          .from('attribute')
          .where(
            'attribute_id',
            'IN',
            Object.values(group).filter((v) => v != null)
          )
          .and('attribute_code', 'IN', Object.keys(queries))
          .execute(pool);

        if (attributes.length > 0) {
          const vsQuery = select()
            .from('product', 'p')
            .select('p.product_id')
            .select('COUNT(p.product_id)', 'count');

          vsQuery
            .innerJoin('product_inventory')
            .on(
              'p.product_id',
              '=',
              'product_inventory.product_inventory_product_id'
            );
          vsQuery
            .innerJoin('product_attribute_value_index', 'a')
            .on('p.product_id', '=', 'a.product_id');
          vsQuery
            .where('p.variant_group_id', '=', product.variant_group_id)
            .and('p.status', '=', 1);

          if (getConfig('catalog.showOutOfStockProduct') === false) {
            vsQuery
              .andWhere('product_inventory.manage_stock', '=', false)
              .addNode(
                node('OR')
                  .addLeaf('AND', 'product_inventory.qty', '>', 0)
                  .addLeaf(
                    'AND',
                    'product_inventory.stock_availability',
                    '=',
                    true
                  )
              );
          }
          vsQuery
            .andWhere(
              'a.attribute_id',
              'IN',
              attributes.map((a) => a.attribute_id)
            )
            .and(
              'a.option_id',
              'IN',
              attributes.map((a) => queries[a.attribute_code])
            );
          vsQuery.groupBy('p.product_id');
          vsQuery.having('COUNT(p.product_id)', '>=', attributes.length);
          const variants = await vsQuery.execute(pool);

          if (variants.length > 0) {
            const variantQuery = select();
            variantQuery
              .from('product')
              .leftJoin('product_description')
              .on(
                'product.product_id',
                '=',
                'product_description.product_description_product_id'
              );
            variantQuery
              .innerJoin('product_inventory')
              .on(
                'product.product_id',
                '=',
                'product_inventory.product_inventory_product_id'
              );
            variantQuery.where('product_id', '=', variants[0].product_id);
            const pv = await variantQuery.load(pool);
            setContextValue(request, 'productId', pv.product_id);
            setContextValue(request, 'pageInfo', {
              title: pv.meta_title || pv.name,
              description: pv.meta_description || pv.short_description
            });
          } else {
            setContextValue(request, 'productId', product.product_id);
            setContextValue(request, 'pageInfo', {
              title: product.meta_title || product.name,
              description: product.meta_description || product.short_description
            });
          }
        } else {
          setContextValue(request, 'productId', product.product_id);
          setContextValue(request, 'pageInfo', {
            title: product.meta_title || product.name,
            description: product.meta_description || product.short_description
          });
        }
      }
      next();
    }
  } catch (e) {
    next(e);
  }
};
