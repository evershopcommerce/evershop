const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { setContextValue } = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

// Importar o mapa de operações
const { OPERATION_MAP } = require('path/to/packages/evershop/src/lib/util/filterOperationMapp');

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
    const minPrice = query.minPrice;
    const maxPrice = query.maxPrice;
    if (minPrice) {
      filtersFromUrl.push({
        key: 'price',
        operation: OPERATION_MAP.gteq,
        value: `${minPrice}`
      });
    }
    if (maxPrice) {
      filtersFromUrl.push({
        key: 'price',
        operation: OPERATION_MAP.lteq,
        value: `${maxPrice}`
      });
    }

    // Category filter
    const categoryFilter = query.cat;
    if (categoryFilter) {
      filtersFromUrl.push({
        key: 'cat',
        operation: OPERATION_MAP.eq,
        value: `${categoryFilter}`
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
            .filter((v) => !Number.isNaN(v));
          if (values.length > 0) {
            filtersFromUrl.push({
              key,
              operation: OPERATION_MAP.in,
              value: values.join(',')
            });
          }
        } else {
          filtersFromUrl.push({
            key,
            operation: OPERATION_MAP.eq,
            value: filter
          });
        }
      }
    });

    // Sort and paging
    const { sortBy, sortOrder = 'DESC', page = '1', limit = '20' } = query;
    if (sortBy) {
      filtersFromUrl.push({
        key: 'sortBy',
        operation: OPERATION_MAP.eq,
        value: sortBy
      });
    }
    filtersFromUrl.push({
      key: 'sortOrder',
      operation: OPERATION_MAP.eq,
      value: sortOrder.toUpperCase()
    });
    filtersFromUrl.push({
      key: 'page',
      operation: OPERATION_MAP.eq,
      value: page.toString()
    });
    filtersFromUrl.push({
      key: 'limit',
      operation: OPERATION_MAP.eq,
      value: limit.toString()
    });

    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
    next();
  }
};
