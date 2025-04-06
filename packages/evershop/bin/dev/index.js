// https://github.com/node-config/node-config/issues/578
import 'dotenv/config';
import { start } from '@evershop/evershop/bin/lib/startUp.js';
import { watchComponents } from '../lib/watch/watchComponents.js';

export default async () => {
  await start(watchComponents);
};
