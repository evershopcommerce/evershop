const { getRoutes } = require('../../src/lib/router/Router');
const { createComponents } = require('../lib/createComponents');
const { start } = require('../lib/startUp');
const { refreshable } = require('../lib/watch/refreshable');
const { watch } = require('../lib/watch/watch');
const { watchMR } = require('../lib/watch/watchMR');
const { watchPage } = require('../lib/watch/watchPage');

(async () => {
  await start(() => {
    watch([
      watchPage
    ]);
    // watchMR();
    // refreshable();
  });
})();
