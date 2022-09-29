const { setContextValue } = require("../../../../graphql/services/contextHelper")

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Cms Pages',
    description: 'Cms Pages'
  });

  const query = request.query;
  if (!query) {
    setContextValue(request, 'filtersFromUrl', []);
    next();
  } else {
    const filtersFromUrl = [];

    // Attribute filters
    Object.keys(query).forEach((key) => {
      const filter = query[key];
      if (Array.isArray(filter)) {
        const values = filter
          .map((v) => parseInt(v))
          .filter((v) => isNaN(v) === false);
        if (values.length > 0) {
          filtersFromUrl.push({
            key: key,
            operation: "=",
            value: values.join(',')
          });
        }
      } else {
        filtersFromUrl.push({
          key: key,
          operation: "=",
          value: filter
        });
      }
    });

    const sortBy = query.sortBy;
    const sortOrder = (query.sortOrder && ['ASC', 'DESC'].includes(query.sortOrder.toUpperCase())) ? query.sortOrder.toUpperCase() : 'ASC';
    if (sortBy) {
      filtersFromUrl.push({
        key: 'sortBy',
        operation: '=',
        value: sortBy
      });
    }

    if (sortOrder !== 'ASC') {
      filtersFromUrl.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder
      });
    }
    // Paging
    const page = isNaN(parseInt(query.page)) ? "1" : query.page.toString();
    if (page !== "1") {
      filtersFromUrl.push({ key: 'page', operation: '=', value: page });
    }
    const limit = isNaN(parseInt(query.limit)) ? "20" : query.limit.toString();// TODO: Get from config
    if (limit !== "20") {
      filtersFromUrl.push({ key: 'limit', operation: '=', value: limit });
    }
    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
  }
}