import { buildFilterFromUrl } from '@evershop/evershop/src/lib/util/buildFilterFromUrl.js';
import { setContextValue } from '@evershop/evershop/src/modules/graphql/services/contextHelper.js';

export default (request, response, delegate, next) => {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
};
