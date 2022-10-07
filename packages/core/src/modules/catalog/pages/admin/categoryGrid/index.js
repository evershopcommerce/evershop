const { buildFilterFromUrl } = require("../../../../../lib/util/buildFilterFromUrl");
const { setContextValue } = require("../../../../graphql/services/contextHelper")

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Categories',
    description: 'Categories'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request.query));
}