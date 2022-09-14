const { select } = require('@evershop/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { camelCase } = require('../../../../../lib/util/camelCase');
const { getFilterableAttributes } = require('../../../services/getFilterableAttributes');
const uniqid = require('uniqid');
const { getProductsBaseQuery } = require('../../../services/getProductsBaseQuery');
const { getPriceRange } = require('../../../services/getPriceRange');

module.exports = {
  Query: {
    category: async (_, { id }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description')
        .on('category_description.`category_description_category_id`', '=', 'category.`category_id`')
      query.where('category_id', '=', id)
        .andWhere('category.`status`', '=', 1);
      const result = await query.load(pool)
      return result ? camelCase(result) : null;
    },
    categories: async (_, { rootId }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description')
        .on('category_description.`category_description_category_id`', '=', 'category.`category_id`');
      query.where('category.`status`', '=', 1);
      const rows = await query.execute(pool)
      return {
        categories: rows.map((row) => camelCase(row)),
        pageInfo: {
          total: rows.length,
          lastPage: 1,
          currentPage: 1
        }
      }
    }
  },
  Category: {
    products: async (category, { filters = [] }, { availableFilters, priceRange }) => {
      const query = getProductsBaseQuery(category.categoryId);
      const filterableAttributes = availableFilters;
      const currentFilters = [];
      // Price filter 
      const priceFilter = filters.find((f) => f.key === 'price');
      if (priceFilter) {
        const [min, max] = priceFilter.value.split('-').map((v) => parseFloat(v));
        let currentPriceFilter;
        if (isNaN(min) === false) {
          query.andWhere('product.`price`', '>=', min);
          currentPriceFilter = { key: 'price', value: `${min}` };
        }

        if (isNaN(max) === false) {
          query.andWhere('product.`price`', '<=', max);
          currentPriceFilter = { key: 'price', value: `${currentPriceFilter.value}-${max}` };
        }
        if (currentPriceFilter) {
          currentFilters.push(currentPriceFilter);
        }
      }
      // TODO: Apply category filters

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'price') {
          return;
        }
        const attribute = filterableAttributes.find((a) => a.attributeCode === filter.key);
        if (attribute) {
          const values = filter.value.split(',')
            .map((v) => parseInt(v))
            .filter((v) => isNaN(v) === false);
          if (values.length > 0) {
            const alias = uniqid();
            query.innerJoin('product_attribute_value_index', alias)
              .on(`${alias}.product_id`, '=', 'product.product_id')
              .and(`${alias}.attribute_id`, '=', attribute.attributeId)
              .and(`${alias}.option_id`, 'IN', values);
          }
          currentFilters.push({
            key: filter.key,
            operation: filter.operation,
            value: values.join(',')
          });
        }
      })

      const sortBy = filters.find((f) => f.key === 'sortBy') || { value: 'product_id' };
      const sortOrder = filters.find((f) => f.key === 'sortDirection' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      query.orderBy(sortBy.value, sortOrder.value);
      currentFilters.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy.value
      });
      currentFilters.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder.value
      });
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(product_id)', 'total');
      // const total = await cloneQuery.load(pool);
      // console.log('total', total);
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));

      return {
        items: async (productCollection, _, { pool }) => {
          const rows = await query.execute(pool);
          return rows.map((row) => camelCase(row));
        },
        total: async (productCollection, _, { pool }) => {
          const rows = await cloneQuery.execute(pool);
          return rows[0].total;
        },
        currentFilters: currentFilters,
      }
    },
    availableFilters: async (category, _, { availableFilters, priceRange }) => {
      // Build the option list by splitting the price range into 5 equal parts
      const options = [];
      const step = (priceRange.max - priceRange.min) / 5;
      for (let i = 0; i < 5; i++) {
        options.push({
          optionId: i,
          optionText: `${priceRange.min + i * step} - ${priceRange.min + (i + 1) * step}`,
        });
      }

      // Add the price filter
      availableFilters.push({
        attributeId: 0,
        attributeCode: 'price',
        attributeLabel: 'Price',
        attributeType: 'price',
        options
      });

      return availableFilters;
    },
    url: (category, _, { pool }) => {
      return buildUrl('categoryView', { url_key: category.urlKey });
    },
    editUrl: (category, _, { pool }) => {
      return buildUrl('categoryEdit', { id: category.categoryId });
    }
  }
}