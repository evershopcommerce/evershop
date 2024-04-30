const {
  buildFilterFromUrl
} = require('@evershop/evershop/src/lib/util/buildFilterFromUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
};
