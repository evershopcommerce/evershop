const { getRoutes } = require('../../src/lib/router/Router');
const { createComponents } = require('../lib/createComponents');
const { start } = require('../lib/startUp');
const { refreshable } = require('../lib/watch/refreshable');
const { watchComponents } = require('../lib/watch/watchComponents');
const { watchMR } = require('../lib/watch/watchMR');

(async () => {
  await start(() => {
    watchComponents();
    watchMR();
    refreshable();
  });
})();