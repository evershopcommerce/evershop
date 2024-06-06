// Importar operações do filtro
const operations = require('@evershop/postgres-query-builder').operations;

const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { setContextValue } = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

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
    const minPrice = query['minPrice'];
    const maxPrice = query['maxPrice'];
    if (minPrice) {
      filtersFromUrl.push({
        key: 'minPrice',
        operation: operations.eq, // Utilizar a operação de igualdade
        value: `${minPrice}`
      });
    }
    if (maxPrice) {
      filtersFromUrl.push({
        key: 'maxPrice',
        operation: operations.eq, // Utilizar a operação de igualdade
        value: `${maxPrice}`
      });
    }

    // Category filter
    const categoryFilter = query['cat'];
    if (categoryFilter) {
      filtersFromUrl.push({
        key: 'cat',
        operation: operations.eq, // Utilizar a operação de igualdade
        value: `${categoryFilter}`
      });
    }

    // Attribute filters
    Object.keys(query).forEach((key) => {
      const filter = query[key];
      const attribute = filterableAttributes.find((a) => a.attribute_code === key);
      if (attribute) {
        if (Array.isArray(filter)) {
          const values = filter.map((v) => parseInt(v, 10)).filter((v) => Number.isNaN(v) === false);
          if (values.length > 0) {
            filtersFromUrl.push({
              key,
              operation: operations.eq, // Utilizar a operação de igualdade
              value: values.join(',')
            });
          }
        } else {
          filtersFromUrl.push({
            key,
            operation: operations.eq, // Utilizar a operação de igualdade
            value: filter
          });
        }
      }
    });

    const { sortBy } = query;
    const sortOrder =
      query.sortOrder && ['DESC', 'ASC'].includes(query.sortOrder.toUpperCase())
        ? query.sortOrder.toUpperCase()
        : 'DESC';
    if (sortBy) {
      filtersFromUrl.push({
        key: 'sortBy',
        operation: operations.eq, // Utilizar a operação de igualdade
        value: sortBy
      });
    }

    filtersFromUrl.push({
      key: 'sortOrder',
      operation: operations.eq, // Utilizar a operação de igualdade
      value: sortOrder
    });

    // Paging
    const page = Number.isNaN(parseInt(query.page, 10)) ? 1 : parseInt(query.page, 10);
    if (page !== 1) {
      filtersFromUrl.push({ key: 'page', operation: operations.eq, value: `${page}` });
    }
    const limit = Number.isNaN(parseInt(query.limit, 10)) ? 20 : parseInt(query.limit, 10);
    if (limit !== 20) {
      filtersFromUrl.push({ key: 'limit', operation: operations.eq, value: `${limit}` });
    }

    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
    next();
  }
};
