import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: EvershopRequest, response) => {
  setPageMetaInfo(request, {
    title: 'Customers',
    description: 'Customers'
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
