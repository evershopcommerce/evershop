const {
  buildFilterFromUrl
} = require('@evershop/evershop/src/lib/util/buildFilterFromUrl');
const {
  setContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
};
