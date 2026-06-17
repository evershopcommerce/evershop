import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
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
      // localizeUrl adds the /<locale> prefix for non-default storefront locales.
      // buildUrl's own (isomorphic) localization is a no-op during GraphQL resolution —
      // its locale source isn't populated then — so the ALS-backed localizeUrl does it.
      // No-op for admin context, the default locale, and /api routes.
      return `${homeUrl}${localizeUrl(buildUrl(routeId, queries))}`;
    }
  }
};
