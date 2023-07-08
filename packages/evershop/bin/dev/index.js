//https://github.com/node-config/node-config/issues/578
process.env.ALLOW_CONFIG_MUTATIONS = true;
const { start } = require('@evershop/evershop/bin/lib/startUp');
const { watch } = require('@evershop/evershop/bin/lib/watch/watch');
const { watchMF } = require('@evershop/evershop/bin/lib/watch/watchMF');
const { watchPage } = require('@evershop/evershop/bin/lib/watch/watchPage');
const { watchSchema } = require('@evershop/evershop/bin/lib/watch/watchSchema');

(async () => {
  await start(() => {
    watch([watchPage, watchSchema, watchMF]);
  });
})();
