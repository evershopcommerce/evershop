const { buildUrl } = require("../../../../../lib/router/buildUrl")

module.exports = {
  Query: {
    url: (root, { routeId, params = [] }, context) => {
      const queries = {};
      params.forEach((param) => {
        queries[param.key] = param.value;
      });

      return buildUrl(routeId, queries);
    }
  }
}