const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  const filterableAttributes = await select()
    .from('attribute')
    .where('type', '=', 'select')
    .and('is_filterable', '=', 1)
    .execute(pool);

  const { query } = request;
  if (!query) {
    setContextValue(request, 'filtersFromUrl', []);
    next();
  } else {
    const filtersFromUrl = [];

    // Price filter
    // const priceFilter = query.price;
    const minPrice = Object.keys(query).find((key) => key === 'minPrice');
    const maxPrice = Object.keys(query).find((key) => key === 'maxPrice');
    if (minPrice) {
      filtersFromUrl.push({
        key: 'minPrice',
        operation: '=',
        value: `${query[minPrice]}`
      });
    }
    if (maxPrice) {
      filtersFromUrl.push({
        key: 'maxPrice',
        operation: '=',
        value: `${query[maxPrice]}`
      });
    }

    // Category filter
    const categoryFilter = Object.keys(query).find((key) => key === 'cat');
    if (categoryFilter) {
      filtersFromUrl.push({
        key: 'cat',
        operation: '=',
        value: `${query[categoryFilter]}`
      });
    }
    // Attribute filters
    Object.keys(query).forEach((key) => {
      const filter = query[key];
      const attribute = filterableAttributes.find(
        (a) => a.attribute_code === key
      );
      if (attribute) {
        if (Array.isArray(filter)) {
          const values = filter
            .map((v) => parseInt(v, 10))
            .filter((v) => Number.isNaN(v) === false);
          if (values.length > 0) {
            filtersFromUrl.push({
              key,
              operation: '=',
              value: values.join(',')
            });
          }
        } else {
          filtersFromUrl.push({
            key,
            operation: '=',
            value: filter
          });
        }
      }
    });

    const { sortBy } = query;
    const sortOrder =
      query.sortOrder && ['ASC', 'DESC'].includes(query.sortOrder.toUpperCase())
        ? query.sortOrder.toUpperCase()
        : 'ASC';
    if (sortBy) {
      filtersFromUrl.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy
      });
    }

    filtersFromUrl.push({
      key: 'sortOrder',
      operation: '=',
      value: sortOrder
    });
    // Paging
    const page = Number.isNaN(parseInt(query.page, 10))
      ? '1'
      : query.page.toString();
    if (page !== '1') {
      filtersFromUrl.push({ key: 'page', operation: '=', value: page });
    }
    const limit = Number.isNaN(parseInt(query.limit, 10))
      ? '20'
      : query.limit.toString(); // TODO: Get from config
    if (limit !== '20') {
      filtersFromUrl.push({ key: 'limit', operation: '=', value: limit });
    }
    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
    next();
  }
};
