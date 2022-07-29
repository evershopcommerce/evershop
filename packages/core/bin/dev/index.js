const { getRoutes } = require('../../src/lib/router/routes');
const { createComponents } = require('../build/createComponents');
const start = require('../lib/startUp');

(async () => {
  const routes = getRoutes();
  await createComponents(routes.filter((r) => (r.isApi === false && !['staticAsset', 'adminStaticAsset'].includes(r.id))));
  start();
})();