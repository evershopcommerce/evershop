const { select, node } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

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
      const query = select().from('product_collection');
      query
        .leftJoin('product')
        .on('product.product_id', '=', 'product_collection.product_id');
      query
        .leftJoin('product_description')
        .on(
          'product_description.product_description_product_id',
          '=',
          'product.product_id'
        );
      query.where(
        'product_collection.collection_id',
        '=',
        collection.collectionId
      );
      if (!user) {
        query.andWhere('product.status', '=', 1);
      }
      const currentFilters = [];
      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'DESC' };

      if (sortBy && sortBy.value === 'price') {
        query.orderBy('product.price', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else if (sortBy && sortBy.value === 'name') {
        query.orderBy('product_description.name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy(
          'product_collection.product_collection_id',
          sortOrder.value
        );
      }
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }

      // Visibility. For variant group
      const copy = query.clone();
      // Get all group that have at lease 1 item visibile
      const visibleGroups = (
        await select('variant_group_id')
          .from('variant_group')
          .where('visibility', '=', 't')
          .execute(pool)
      ).map((v) => v.variant_group_id);

      if (visibleGroups) {
        // Get all invisible variants from current query
        copy
          .select('bool_or(product.visibility)', 'sumv')
          .select('max(product.product_id)', 'product_id')
          .andWhere('product.variant_group_id', 'IN', visibleGroups);
        copy.groupBy('product.variant_group_id');
        copy.orderBy('product.variant_group_id', 'ASC');
        copy.having('bool_or(product.visibility)', '=', false);
        const invisibleIds = (await copy.execute(pool)).map(
          (v) => v.product_id
        );
        if (invisibleIds.length > 0) {
          const n = node('AND');
          n.addLeaf('AND', 'product.product_id', 'IN', invisibleIds).addNode(
            node('OR').addLeaf('OR', 'product.visibility', '=', true)
          );
          query.getWhere().addNode(n);
        } else {
          query.andWhere('product.visibility', '=', true);
        }
      } else {
        query.andWhere('product.visibility', '=', true);
      }

      // Clone the main query for getting total right before doing the paging
      const totalQuery = query.clone();
      totalQuery.select('COUNT(product.product_id)', 'total');
      totalQuery.removeOrderBy();
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
        itemQuery: query,
        totalQuery,
        currentFilters
      };
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
      const collection = await select()
        .from('collection')
        .where('collection_id', '=', product.collectionId)
        .load(pool);
      if (!collection) {
        return null;
      }
      if (product.uuid) {
        return buildUrl('removeProductFromCollection', {
          collection_id: collection.uuid,
          product_id: product.uuid
        });
      } else {
        return null;
      }
    }
  }
};
