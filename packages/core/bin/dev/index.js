const { getRoutes } = require('../../src/lib/router/Router');
const { createComponents } = require('../build/createComponents');
const { start } = require('../lib/startUp');
const { refreshable } = require('../lib/watch/refreshable');
const { watchComponents } = require('../lib/watch/watchComponents');
const { watchMR } = require('../lib/watch/watchMR');

(async () => {
  const routes = getRoutes();
  await createComponents(routes.filter((r) => (r.isApi === false && !['staticAsset', 'adminStaticAsset'].includes(r.id))));
  start(() => {
    watchComponents();
    watchMR();
    refreshable();
  });
})();