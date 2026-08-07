import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { StorefrontRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: StorefrontRequest, response) => {
  setPageMetaInfo(request, {
    title: 'Attributes',
    description: 'Attributes'
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
