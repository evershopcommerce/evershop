const { buildFilterFromUrl } = require("../../../../../lib/util/buildFilterFromUrl");
const { setContextValue } = require("../../../../graphql/services/buildContext")

module.exports = (request, response) => {
  setContextValue('pageInfo', {
    title: 'Products',
    description: 'Products'
  });
  const query = request.query;
  setContextValue('filtersFromUrl', buildFilterFromUrl(query));
}