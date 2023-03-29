const { select, node } = require('@evershop/postgres-query-builder');
const uniqid = require('uniqid');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getProductsBaseQuery
} = require('../../../services/getProductsBaseQuery');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getFilterableAttributes
} = require('../../../services/getFilterableAttributes');

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
    },
    products: async (_, { filters = [] }) => {
      const query = select().from('product');
      query
        .leftJoin('product_description', 'des')
        .on('product.product_id', '=', 'des.product_description_product_id');
      const currentFilters = [];
      // Price filter
      const priceFilter = filters.find((f) => f.key === 'price');
      if (priceFilter) {
        const [min, max] = priceFilter.value
          .split('-')
          .map((v) => parseFloat(v));
        let currentPriceFilter;
        if (Number.isNaN(min) === false) {
          query.andWhere('product.price', '>=', min);
          currentPriceFilter = {
            key: 'price',
            operation: '=',
            value: `${min}`
          };
        }

        if (Number.isNaN(max) === false) {
          query.andWhere('product.price', '<=', max);
          currentPriceFilter = {
            key: 'price',
            operation: '=',
            value: `${currentPriceFilter.value}-${max}`
          };
        }
        if (currentPriceFilter) {
          currentFilters.push(currentPriceFilter);
        }
      }

      // Qty filter
      const qtyFilter = filters.find((f) => f.key === 'qty');
      if (qtyFilter) {
        const [min, max] = qtyFilter.value.split('-').map((v) => parseFloat(v));
        let currentQtyFilter;
        if (Number.isNaN(min) === false) {
          query.andWhere('product.qty', '>=', min);
          currentQtyFilter = { key: 'qty', operation: '=', value: `${min}` };
        }

        if (Number.isNaN(max) === false) {
          query.andWhere('product.qty', '<=', max);
          currentQtyFilter = {
            key: 'qty',
            operation: '=',
            value: `${currentQtyFilter.value}-${max}`
          };
        }
        if (currentQtyFilter) {
          currentFilters.push(currentQtyFilter);
        }
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

      // Sku filter
      const skuFilter = filters.find((f) => f.key === 'sku');
      if (skuFilter) {
        query.andWhere('product.sku', 'LIKE', `%${skuFilter.value}%`);
        currentFilters.push({
          key: 'sku',
          operation: '=',
          value: skuFilter.value
        });
      }

      // Status filter
      const statusFilter = filters.find((f) => f.key === 'status');
      if (statusFilter) {
        query.andWhere('product.status', '=', statusFilter.value);
        currentFilters.push({
          key: 'status',
          operation: '=',
          value: statusFilter.value
        });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'price') {
        query.orderBy('product.price', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else if (sortBy && sortBy.value === 'name') {
        query.orderBy('des.name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('product.product_id', 'DESC');
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
      cloneQuery.select('COUNT(product.product_id)', 'total');
      cloneQuery.removeOrderBy();
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
        totalQuery: cloneQuery,
        currentFilters
      };
    }
  },
  Category: {
    products: async (category, { filters = [] }) => {
      const query = await getProductsBaseQuery(category.categoryId);
      const currentFilters = [];
      // Price filter
      const minPrice = filters.find((f) => f.key === 'minPrice');
      const maxPrice = filters.find((f) => f.key === 'maxPrice');
      if (minPrice && Number.isNaN(parseFloat(minPrice.value)) === false) {
        query.andWhere('product.price', '>=', minPrice.value);
        currentFilters.push({
          key: 'minPrice',
          operation: '=',
          value: minPrice.value
        });
      }
      if (maxPrice && Number.isNaN(parseFloat(maxPrice.value)) === false) {
        query.andWhere('product.price', '<=', maxPrice.value);
        currentFilters.push({
          key: 'maxPrice',
          operation: '=',
          value: maxPrice.value
        });
      }

      // TODO: Apply category filters
      const filterableAttributes = await select()
        .from('attribute')
        .where('type', '=', 'select')
        .and('is_filterable', '=', 1)
        .execute(pool);
      // Attribute filters
      filters.forEach((filter) => {
        const attribute = filterableAttributes.find(
          (a) => a.attribute_code === filter.key
        );
        if (!attribute) {
          return;
        }

        const values = filter.value
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => Number.isNaN(v) === false);
        if (values.length > 0) {
          const alias = uniqid();
          query
            .innerJoin('product_attribute_value_index', alias)
            .on(`${alias}.product_id`, '=', 'product.product_id')
            .and(`${alias}.attribute_id`, '=', attribute.attribute_id)
            .and(`${alias}.option_id`, 'IN', values);
        }
        currentFilters.push({
          key: filter.key,
          operation: filter.operation,
          value: values.join(',')
        });
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
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
        query.orderBy('product.product_id', sortOrder.value);
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
        copy.having('bool_or(product.visibility)', '=', 'f');
        const invisibleIds = (await copy.execute(pool)).map(
          (v) => v.product_id
        );
        if (invisibleIds.length > 0) {
          const n = node('AND');
          n.addLeaf('AND', 'product.product_id', 'IN', invisibleIds).addNode(
            node('OR').addLeaf('OR', 'product.visibility', '=', 't')
          );
          query.getWhere().addNode(n);
        } else {
          query.andWhere('product.visibility', '=', 't');
        }
      } else {
        query.andWhere('product.visibility', '=', 't');
      }

      // Clone the main query for getting total right before doing the paging
      const totalQuery = query.clone();
      totalQuery.select('COUNT(product.product_id)', 'total');
      totalQuery.removeOrderBy();
      // const total = await cloneQuery.load(pool);
      // console.log('total', total);
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
    availableAttributes: async (category) => {
      const results = await getFilterableAttributes(category.categoryId);
      return results;
    },
    priceRange: async (category) => {
      const query = await getProductsBaseQuery(category.categoryId);
      query
        .select('MIN(product.price)', 'min')
        .select('MAX(product.price)', 'max');
      const result = await query.load(pool);
      return {
        min: result.min || 0,
        max: result.max || 0
      };
    },
    url: (category) => buildUrl('categoryView', { url_key: category.urlKey }),
    editUrl: (category) => buildUrl('categoryEdit', { id: category.uuid }),
    updateApi: (category) => buildUrl('updateCategory', { id: category.uuid }),
    deleteApi: (category) => buildUrl('deleteCategory', { id: category.uuid }),
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
    }
  },
  ProductCollection: {
    items: async ({ itemQuery }) =>
      (await itemQuery.execute(pool)).map((row) => camelCase(row)),
    total: async ({ totalQuery }) => {
      const result = await totalQuery.load(pool);
      return result.total;
    }
  }
};
