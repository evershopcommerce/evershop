import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, next) => {
  // Check if the user is logged in
  const user = request.getCurrentUser();
  if (user) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('dashboard'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
};
