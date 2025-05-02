import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  Query: {
    url: (root, { routeId, params = [] }, { homeUrl }) => {
      const queries = [];
      params.forEach((param) => {
        // Check if the key is a string number
        if (param.key.match(/^[0-9]+$/)) {
          queries.push(param.value);
        } else {
          queries[param.key] = param.value;
        }
      });
      return `${homeUrl}${buildUrl(routeId, queries)}`;
    }
  }
};
