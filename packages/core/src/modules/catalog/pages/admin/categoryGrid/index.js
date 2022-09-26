const { buildFilterFromUrl } = require("../../../../../lib/util/buildFilterFromUrl");
const { setContextValue } = require("../../../../graphql/services/buildContext")

module.exports = (request, response) => {
  setContextValue('pageInfo', {
    title: 'Categories',
    description: 'Categories'
  });
  setContextValue('filtersFromUrl', buildFilterFromUrl(request.query));
}