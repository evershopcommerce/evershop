import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { StorefrontRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default (request: StorefrontRequest, response) => {
  setPageMetaInfo(request, {
    title: 'Widgets',
    description: 'Widgets'
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
