import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response, next) => {
  // Check if the user is logged in
  const user = request.getCurrentUser();
  if (user) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('dashboard'));
  } else {
    setPageMetaInfo(request, {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
};
