const router = require('../../../lib/router/buildUrl');
const bundlee = require('../../../lib/bundlee');
const { assign } = require('../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    const siteRoutes = router.getSiteRoutes();
    await bundlee(request, response, siteRoutes.find((r) => r.id === 'notFound'));
    assign(response.context, { metaTitle: 'Not found', metaDescription: 'Not found' });
    next();
  }
};
