const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  getProductsBaseQuery
} = require('../../../services/getProductsBaseQuery');
const { ProductCollection } = require('../../../services/ProductCollection');

module.exports = {
  Product: {
    category: async (product, _, { pool }) => {
      const query = select().from('category');
      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );
      query.where('category_id', '=', product.categoryId);
      const result = await query.load(pool);
      if (!result) {
        return null;
      } else {
        return camelCase(result);
      }
    },
    url: async (product, _, { pool }) => {
      // Get the url rewrite for this product
      const urlRewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', product.uuid)
        .and('entity_type', '=', 'product')
        .load(pool);
      if (!urlRewrite) {
        return buildUrl('productView', { uuid: product.uuid });
      } else {
        return urlRewrite.request_path;
      }
    },
    editUrl: (product) => buildUrl('productEdit', { id: product.uuid }),
    updateApi: (product) => buildUrl('updateProduct', { id: product.uuid }),
    deleteApi: (product) => buildUrl('deleteProduct', { id: product.uuid })
  },
  Query: {
    product: async (_, { id }, { pool }) => {
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
      query.where('product.product_id', '=', id);
      const result = await query.load(pool);
      if (!result) {
        return null;
      } else {
        return camelCase(result);
      }
    },
    // searchProducts: async (
    //   _,
    //   { query = '', page = 1, limit = 20 },
    //   { user }
    // ) => {
    //   // Using full text search on the product_description table
    //   const query = `LEFT JOIN product_description ON product.product_id = product_description.product_description_product_id
    //   LEFT JOIN product_inventory ON product.product_id = product_inventory.product_inventory_product_id
    //   WHERE to_tsvector('simple', name || ' ' || description) @@ websearch_to_tsquery('simple', $1)`;
    //   if (!user) {
    //     query += ` AND product.status = true`;
    //     query += ` AND product.visibility = true`;
    //     if (getConfig('catalog.showOutOfStockProduct', false) === false) {
    //       query += ` AND (product_inventory.manage_stock = false OR (product_inventory.qty > 0 AND product_inventory.stock_availability = true))`;
    //     }
    //   }

    //   const totalQuery = `SELECT COUNT(product.product_id) as total FROM product ${query}`;
    //   const itemsQuery = `SELECT product ${query} LIMIT $2 OFFSET $3`;

    //   // Query for total
    //   const totalResults = await pool.query(totalQuery, [query]);
    //   const total = totalResults.rows[0].total;

    //   // Query for items
    //   const itemsResults = await pool.query(itemsQuery, [
    //     query,
    //     limit,
    //     (page - 1) * limit
    //   ]);
    //   const items = itemsResults.rows.map((item) => camelCase(item));
    //   return {
    //     items,
    //     total
    //   };
    // },
    products: async (_, { filters = [] }, { user }) => {
      const query = getProductsBaseQuery();
      const root = new ProductCollection(query);
      await root.init({}, { filters }, { user });
      return root;
    }
  }
};
