import { buildFilterFromUrl } from '@evershop/evershop/src/lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, delegate, next) => {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
};
