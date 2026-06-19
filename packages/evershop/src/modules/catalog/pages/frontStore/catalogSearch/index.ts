import { translate } from '../../../../../lib/locale/translate/translate.js';
import { get } from '../../../../../lib/util/get.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request: EvershopRequest, response, next) => {
  // Page-builder preview keeps the merchandiser on /search even when no
  // `keyword` is set so widgets attached to the route can be edited. The
  // production path still redirects to `/` for empty searches.
  const isPageBuilderPreview =
    typeof get(request, 'query.changeset') === 'string';
  // Get the keyword from the request query
  const keyword = get(request, 'query.keyword');
  if (!keyword && !isPageBuilderPreview) {
    // Redirect to the home page if no keyword is not provided
    response.redirect('/');
  } else {
    setPageMetaInfo(request, {
      title: keyword
        ? translate('Search results for: ${keyword}', { keyword })
        : translate('Search'),
      description: keyword
        ? translate('Search results for: ${keyword}', { keyword })
        : translate('Search')
    });
    next();
  }
};
