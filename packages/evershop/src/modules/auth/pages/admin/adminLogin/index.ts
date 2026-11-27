import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getSafeRedirectPath } from '../../../../../lib/util/safeRedirect.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response, next) => {
  // Check if the user is logged in
  const user = request.getCurrentUser();
  if (user) {
    // Go to the admin page named in `?redirect=` (a shared link), else the
    // dashboard. Only admin paths on this site are accepted.
    const adminRoot = buildUrl('dashboard');
    const target = getSafeRedirectPath(request.query?.redirect, {
      prefix: adminRoot
    });
    response.redirect(target ?? adminRoot);
  } else {
    setPageMetaInfo(request, {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
};
