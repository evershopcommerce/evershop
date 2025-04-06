import { buildFilterFromUrl } from '@evershop/evershop/src/lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Coupons',
    description: 'Coupons'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
