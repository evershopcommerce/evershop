const {
  buildFilterFromUrl
} = require('@evershop/evershop/src/lib/util/buildFilterFromUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Products',
    description: 'Products'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
