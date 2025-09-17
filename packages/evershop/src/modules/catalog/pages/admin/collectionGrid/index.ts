import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Collections',
    description: 'Collections'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
