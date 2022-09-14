const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue, getContextValue } = require('../../../../graphql/services/buildContext');
const { getFilterableAttributes } = require('../../../services/getFilterableAttributes');
const { getPriceRange } = require('../../../services/getPriceRange');

module.exports = async (request, response, delegate, next) => {
  const filterableAttributes = await getFilterableAttributes(getContextValue('categoryId'));

  // Set the filterable attributes to the context so that we can use it in the graphql query
  setContextValue('filterableAttributes', filterableAttributes);
  setContextValue('priceRange', await getPriceRange(getContextValue('categoryId')));

  const query = request.query;
  if (!query) {
    setContextValue('filtersFromUrl', []);
    next();
  } else {
    const filtersFromUrl = [];

    // Price filter 
    const priceFilter = query.price;
    if (priceFilter) {
      const [min, max] = priceFilter.value.split('-').map((v) => parseFloat(v));
      let currentPriceFilter;
      if (isNaN(min) === false) {
        currentPriceFilter = { key: 'price', value: `${min}` };
      }

      if (isNaN(max) === false) {
        currentPriceFilter = { key: 'price', value: `${currentPriceFilter.value}-${max}` };
      }
      if (currentPriceFilter) {
        filtersFromUrl.push(currentPriceFilter);
      }
    }

    // Attribute filters
    Object.keys(query).forEach((key) => {
      const filter = query[key];
      const attribute = filterableAttributes.find((a) => a.attributeCode === key);
      if (attribute) {
        if (isArray(filter)) {
          const values = filter
            .map((v) => parseInt(v))
            .filter((v) => isNaN(v) === false);
          if (values.length > 0) {
            filtersFromUrl.push({
              key: filter.key,
              operation: filter.operation,
              value: values.join(',')
            });
          }
        } else {
          filtersFromUrl.push({
            key: filter.key,
            operation: filter.operation,
            value: filter.value
          });
        }
      }
    });

    const sortBy = filters.find((f) => f.key === 'sortBy') || { value: 'product_id' };
    const sortOrder = filters.find((f) => f.key === 'sortDirection' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
    filtersFromUrl.push({
      key: 'sortBy',
      operation: '=',
      value: sortBy.value
    });
    filtersFromUrl.push({
      key: 'sortOrder',
      operation: '=',
      value: sortOrder.value
    });
    // Paging
    const page = filters.find((f) => f.key === 'page') || { key: 'page', operation: '=', value: 1 };
    filtersFromUrl.push(page);
    const limit = filters.find((f) => f.key === 'limit') || { key: 'limit', operation: '=', value: 20 };// TODO: Get from config
    filtersFromUrl.push(limit);
    setContextValue('filtersFromUrl', filtersFromUrl);
    next();
  }
};
