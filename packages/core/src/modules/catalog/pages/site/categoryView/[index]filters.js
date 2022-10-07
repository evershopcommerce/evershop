const { setContextValue, getContextValue } = require('../../../../graphql/services/contextHelper');
const { getFilterableAttributes } = require('../../../services/getFilterableAttributes');
const { getPriceRange } = require('../../../services/getPriceRange');

module.exports = async (request, response, delegate, next) => {
  const filterableAttributes = await getFilterableAttributes(getContextValue(request, 'categoryId'));

  // Set the filterable attributes to the context so that we can use it in the graphql query
  setContextValue(request, 'filterableAttributes', filterableAttributes);
  setContextValue(request, 'priceRange', await getPriceRange(getContextValue(request, 'categoryId')));

  const query = request.query;
  if (!query) {
    setContextValue(request, 'filtersFromUrl', []);
    next();
  } else {
    const filtersFromUrl = [];

    // Price filter 
    // const priceFilter = query.price;
    // if (priceFilter) {
    //   const [min, max] = priceFilter.value.split('-').map((v) => parseFloat(v));
    //   let currentPriceFilter;
    //   if (isNaN(min) === false) {
    //     currentPriceFilter = { key: 'price', value: `${min}` };
    //   }

    //   if (isNaN(max) === false) {
    //     currentPriceFilter = { key: 'price', value: `${currentPriceFilter.value}-${max}` };
    //   }
    //   if (currentPriceFilter) {
    //     filtersFromUrl.push(currentPriceFilter);
    //   }
    // }

    // Attribute filters
    Object.keys(query).forEach((key) => {
      const filter = query[key];
      const attribute = filterableAttributes.find((a) => a.attributeCode === key);
      if (attribute) {
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
    console.log('filtersFromUrl', filtersFromUrl)
    setContextValue(request, 'filtersFromUrl', filtersFromUrl);
    next();
  }
};
