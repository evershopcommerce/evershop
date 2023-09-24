const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { select } = require('@evershop/postgres-query-builder');
const {
  setContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');
const { aRandomToken } = require('../../../services/aRandomToken');

module.exports = async (request, response, delegate, next) => {
  try {
    // Get the token from the query params
    const { token } = request.params;
    if (aRandomToken !== token) {
      // Redirect to the home page
      response.redirect(buildUrl('homepage'));
    } else {
      // Only allow the user to create the admin user if there is no admin user in the database.
      const users = await select().from('admin_user').execute(pool);
      if (users.length > 0) {
        // Redirect to the home page
        response.redirect(buildUrl('homepage'));
      } else {
        setContextValue(request, 'pageInfo', {
          title: 'Create your first admin user',
          description: 'Create your first admin user',
          url: request.url
        });
        next();
      }
    }
  } catch (e) {
    next(e);
  }
};
