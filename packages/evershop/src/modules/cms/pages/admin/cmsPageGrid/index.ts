import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Cms pages',
    description: 'Cms pages'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
