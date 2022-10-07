const { start } = require('../lib/startUp');
const { watch } = require('../lib/watch/watch');
const { watchMF } = require('../lib/watch/watchMF');
const { watchPage } = require('../lib/watch/watchPage');
const { watchSchema } = require('../lib/watch/watchSchema');

(async () => {
  await start(() => {
    watch([
      watchPage,
      watchSchema,
      watchMF
    ]);
  });
})();
