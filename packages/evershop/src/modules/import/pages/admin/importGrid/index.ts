import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
  setPageMetaInfo(request, {
    title: 'Import',
    description: 'Past imports'
  });
};
