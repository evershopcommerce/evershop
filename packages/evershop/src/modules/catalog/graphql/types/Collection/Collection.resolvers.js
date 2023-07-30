const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { ProductCollection } = require('../../../services/ProductCollection');
const {
  getProductsByCollectionBaseQuery
} = require('../../../services/getProductsByCollectionBaseQuery');

module.exports = {
  Query: {
    collection: async (_, { code }) => {
      const query = select().from('collection');
      query.where('code', '=', code);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    },
    collections: async (_, { filters = [] }) => {
      const query = select().from('collection');
      const currentFilters = [];
      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere('collection.name', 'LIKE', `%${nameFilter.value}%`);
        currentFilters.push({
          key: 'name',
          operation: '=',
          value: nameFilter.value
        });
      }

      // Code filter
      const codeFilter = filters.find((f) => f.key === 'code');
      if (codeFilter) {
        query.andWhere('collection.code', 'LIKE', `%${codeFilter.value}%`);
        currentFilters.push({
          key: 'code',
          operation: '=',
          value: codeFilter.value
        });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('collection.name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('collection.collection_id', 'DESC');
      }
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.removeOrderBy();
      cloneQuery.select('COUNT(collection.collection_id)', 'total');
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit(
        (page.value - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );
      return {
        items: (await query.execute(pool)).map((row) => camelCase(row)),
        total: (await cloneQuery.load(pool)).total,
        currentFilters
      };
    }
  },
  Collection: {
    products: async (collection, { filters = [] }, { user }) => {
      const query = getProductsByCollectionBaseQuery(collection.collectionId);
      const root = new ProductCollection(query);
      await root.init(collection, { filters }, { user });
      return root;
    },
    editUrl: (collection) =>
      buildUrl('collectionEdit', { id: collection.uuid }),
    addProductUrl: (collection) =>
      buildUrl('addProductToCollection', { collection_id: collection.uuid }),
    updateApi: (collection) =>
      buildUrl('updateCollection', { id: collection.uuid }),
    deleteApi: (collection) =>
      buildUrl('deleteCollection', { id: collection.uuid })
  },
  Product: {
    collections: async (product, _, { pool }) => {
      const query = select().from('product_collection');
      query
        .leftJoin('collection')
        .on(
          'collection.collection_id',
          '=',
          'product_collection.collection_id'
        );
      query.where('product_id', '=', product.productId);
      return (await query.execute(pool)).map((row) => camelCase(row));
    },
    removeFromCollectionUrl: async (product) => {
      if (!product.collectionId) {
        return null;
      } else {
        const collection = await select()
          .from('collection')
          .where('collection_id', '=', product.collectionId)
          .load(pool);
        return buildUrl('removeProductFromCollection', {
          collection_id: collection.uuid,
          product_id: product.uuid
        });
      }
    }
  }
};
