// https://github.com/node-config/node-config/issues/578
import 'dotenv/config';
import { start } from '@evershop/evershop/bin/lib/startUp.js';

process.env.ALLOW_CONFIG_MUTATIONS = true;

export default start;
