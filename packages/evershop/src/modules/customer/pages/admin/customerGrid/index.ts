import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Customers',
    description: 'Customers'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
