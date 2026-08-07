import { translate } from '../../../../lib/locale/translate/translate.js';
import { getRoutes } from '../../../../lib/router/Router.js';
import { setPageMetaInfo } from '../../../cms/services/pageMetaInfo.js';

export default async (request, response, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    const routes = getRoutes();
    if (request.currentRoute?.isAdmin) {
      request.currentRoute = routes.find((r) => r.id === 'adminNotFound');
    } else {
      request.currentRoute = routes.find((r) => r.id === 'notFound');
    }
    setPageMetaInfo(request, {
      title: translate('Not found'),
      description: translate('Page not found')
    });
    next();
  }
};
