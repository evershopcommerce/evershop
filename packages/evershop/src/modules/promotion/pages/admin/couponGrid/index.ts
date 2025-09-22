import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Coupons',
    description: 'Coupons'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
