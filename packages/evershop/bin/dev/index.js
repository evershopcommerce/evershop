// https://github.com/node-config/node-config/issues/578
import 'dotenv/config';
import { start } from '@evershop/evershop/bin/lib/startUp';
import { watchComponents } from '../lib/watch/watchComponents';

process.env.ALLOW_CONFIG_MUTATIONS = true;

(async () => {
  await start(watchComponents);
})();
