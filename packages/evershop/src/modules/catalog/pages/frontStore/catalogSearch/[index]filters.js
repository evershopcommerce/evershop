const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const {
  setContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  const { query } = request;
  if (!query) {
    setContextValue(request, 'filtersFromUrl', []);
    next();
  } else {
    const filtersFromUrl = [];

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

    if (sortOrder !== 'ASC') {
      filtersFromUrl.push({
        key: 'sortOrder',
        operation: '=',
        value: sortOrder
      });
    }
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

    // Remove html tags
    const {keyword} = query;
    setContextValue(request, 'pageInfo', {
      title: translate('Search results for "${keyword}"', { keyword }),
      description: translate('Search results for "${keyword}"', { keyword })
    });

    filtersFromUrl.push({
      key: 'keyword',
      operation: '=',
      value: keyword
    });

    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
    next();
  }
};
