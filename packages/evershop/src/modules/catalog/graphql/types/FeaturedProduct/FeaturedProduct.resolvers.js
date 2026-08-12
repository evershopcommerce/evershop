import { node, select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getShowOutOfStockProducts } from '../../../services/catalogSettings.js';

export default {
  Query: {
    featuredProducts: async (root, { limit = 4 }, { pool }) => {
      const query = select('product.product_id')
        .select('product.sku')
        .select('product.price')
        .select('product_description.product_description_id')
        .select('product_description.name')
        .select('product_description.url_key')
        .select('product.image')
        .select('SUM(cart_item.qty)', 'soldQty')
        .from('product');
      query
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
      query
        .leftJoin('cart_item')
        .on('cart_item.product_id', '=', 'product.product_id');
      query.where('product.status', '=', 1);
      query.andWhere('product.visibility', '=', 1);
      if (getShowOutOfStockProducts() === false) {
        // Wrap the disjunction in its own node — see Variant.resolvers.js:
        // the chained form let disabled/invisible products with stock leak
        // into the featured list via the unguarded OR operand.
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
      query.groupBy(
        'product.product_id',
        'product_description.product_description_id'
      );
      query.orderBy('SUM(cart_item.qty)', 'desc');
      query.limit(0, parseInt(limit, 10));
      const products = await query.execute(pool);
      return products.map((product) => camelCase(product));
    }
  }
};
