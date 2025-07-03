import { translate } from '../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Not found'),
      description: translate('Page not found')
    });
    next();
  }
};
