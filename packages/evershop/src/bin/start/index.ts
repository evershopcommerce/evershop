// https://github.com/node-config/node-config/issues/578
import 'dotenv/config';
import { start } from '../lib/startUp.js';
process.env.NODE_ENV = 'production';

start();
process.on('uncaughtException', function (exception) {
  import('../../lib/log/logger.js').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  console.log('11111', p);
  import('../../lib/log/logger.js').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});
