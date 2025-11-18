import { translate } from '../../../../lib/locale/translate/translate.js';
import { setPageMetaInfo } from '../../../cms/services/pageMetaInfo.js';

export default async (request, response, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    setPageMetaInfo(request, {
      title: translate('Not found'),
      description: translate('Page not found')
    });
    next();
  }
};
