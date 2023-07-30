const { select, execute } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getProductsByCategoryBaseQuery
} = require('../../../services/getProductsByCategoryBaseQuery');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getFilterableAttributes
} = require('../../../services/getFilterableAttributes');
const { ProductCollection } = require('../../../services/ProductCollection');

module.exports = {
  Query: {
    category: async (_, { id }) => {
      const query = select().from('category');
      query
        .leftJoin('category_description')
        .on(
          'category_description.category_description_category_id',
          '=',
          'category.category_id'
        );
      query.where('category_id', '=', id);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    },
    categories: async (_, { filters = [] }) => {
      const query = select().from('category');
      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );

      const currentFilters = [];
      // Parent filter
      const parentFilter = filters.find((f) => f.key === 'parent');
      if (parentFilter) {
        if (parentFilter.value === null) {
          query.andWhere('category.parent_id', 'IS NULL', null);
        } else {
          query.andWhere('category.parent_id', '=', parentFilter.value);
        }
        currentFilters.push({
          key: 'parent',
          operation: '=',
          value: parentFilter.value
        });
      }

      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere('des.name', 'LIKE', `%${nameFilter.value}%`);
        currentFilters.push({
          key: 'name',
          operation: '=',
          value: nameFilter.value
        });
      }

      // Status filter
      const statusFilter = filters.find((f) => f.key === 'status');
      if (statusFilter) {
        query.andWhere('category.status', '=', statusFilter.value);
        currentFilters.push({
          key: 'status',
          operation: '=',
          value: statusFilter.value
        });
      }

      // includeInNav filter
      const includeInNav = filters.find((f) => f.key === 'includeInNav');
      if (includeInNav) {
        query.andWhere('category.include_in_nav', '=', includeInNav.value);
        currentFilters.push({
          key: 'includeInNav',
          operation: '=',
          value: includeInNav.value
        });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('des.name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('category.category_id', 'DESC');
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
      cloneQuery.select('COUNT(category.category_id)', 'total');
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
  Category: {
    products: async (category, { filters = [] }, { user }) => {
      const query = await getProductsByCategoryBaseQuery(
        category.categoryId,
        user ? false : true
      );
      const root = new ProductCollection(query);
      await root.init(category, { filters }, { user });
      return root;
    },
    availableAttributes: async (category) => {
      const results = await getFilterableAttributes(category.categoryId);
      return results;
    },
    priceRange: async (category) => {
      const query = await getProductsByCategoryBaseQuery(
        category.categoryId,
        true
      );
      query
        .select('MIN(product.price)', 'min')
        .select('MAX(product.price)', 'max');
      const result = await query.load(pool);
      return {
        min: result.min || 0,
        max: result.max || 0
      };
    },
    url: async (category, _, { pool }) => {
      // Get the url rewrite for this category
      const urlRewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', category.uuid)
        .and('entity_type', '=', 'category')
        .load(pool);
      if (!urlRewrite) {
        return buildUrl('categoryView', { uuid: category.uuid });
      } else {
        return urlRewrite.request_path;
      }
    },
    editUrl: (category) => buildUrl('categoryEdit', { id: category.uuid }),
    updateApi: (category) => buildUrl('updateCategory', { id: category.uuid }),
    deleteApi: (category) => buildUrl('deleteCategory', { id: category.uuid }),
    addProductUrl: (category) =>
      buildUrl('addProductToCategory', { category_id: category.uuid }),
    image: (category) => {
      const { image } = category;
      if (!image) {
        return null;
      } else {
        return {
          path: image,
          url: `/assets${image}`
        };
      }
    },
    children: async (category) => {
      const query = select().from('category');
      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );
      query.where('category.parent_id', '=', category.categoryId);
      const results = await query.execute(pool);
      return results.map((row) => camelCase(row));
    },
    path: async (category, _, { pool }) => {
      const query = await execute(
        pool,
        `WITH RECURSIVE category_path AS (
          SELECT category_id, parent_id, 1 AS level
          FROM category
          WHERE category_id = ${category.categoryId}
          UNION ALL
          SELECT c.category_id, c.parent_id, cp.level + 1
          FROM category c
          INNER JOIN category_path cp ON cp.parent_id = c.category_id
        )
        SELECT category_id FROM category_path ORDER BY level DESC`
      );
      const categories = query.rows;
      // Loop the categories and load the category description
      return Promise.all(
        categories.map(async (c) => {
          const query = select().from('category');
          query
            .leftJoin('category_description', 'des')
            .on(
              'des.category_description_category_id',
              '=',
              'category.category_id'
            );
          query.where('category.category_id', '=', c.category_id);
          return camelCase(await query.load(pool));
        })
      );
    },
    parent: async (category, _, { pool }) => {
      if (!category.parentId) {
        return null;
      }
      const query = select().from('category');
      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );
      query.where('category.category_id', '=', category.parentId);
      return camelCase(await query.load(pool));
    }
  },
  Product: {
    removeFromCategoryUrl: async (product) => {
      if (!product.categoryId) {
        return null;
      } else {
        const category = await select()
          .from('category')
          .where('category_id', '=', product.categoryId)
          .load(pool);
        return buildUrl('removeProductFromCategory', {
          category_id: category.uuid,
          product_id: product.uuid
        });
      }
    }
  }
};
