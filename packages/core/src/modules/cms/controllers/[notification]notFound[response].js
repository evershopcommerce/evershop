const { getSiteRoutes } = require('../../../lib/router/routes');
const bundlee = require('../../../lib/bundlee');
const { assign } = require('../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    const siteRoutes = getSiteRoutes();
    const route = siteRoutes.find((r) => r.id === 'notFound');
    request.app.set('route', route);
    await bundlee(request, response, route);
    assign(response.context, { metaTitle: 'Not found', metaDescription: 'Not found' });
    next();
  }
};
