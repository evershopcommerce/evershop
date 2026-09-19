import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response, next) => {
  // Check if the user is logged in
  if (request.isCustomerLoggedIn()) {
    // Honour a same-site `?redirect=` (e.g. back to checkout); otherwise the homepage.
    const redirect = request.query?.redirect;
    const target =
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//')
        ? redirect
        : buildUrl('homepage');
    response.redirect(target);
  } else {
    setPageMetaInfo(request, {
      title: translate('Login'),
      description: translate('Login')
    });
    next();
  }
};
