import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Blog',
    description: 'Latest posts',
    breadcrumbs: [
      { title: 'Home', url: localizeUrl('/') },
      { title: 'Blog', url: localizeUrl('/blog') }
    ]
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
