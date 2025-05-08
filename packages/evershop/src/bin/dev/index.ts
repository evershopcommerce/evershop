// https://github.com/node-config/node-config/issues/578
import 'dotenv/config';
import { start } from '../../bin/lib/startUp.js';
process.env.NODE_ENV = 'development';

start();
process.on('uncaughtException', function (exception) {
  import('../../lib/log/logger.js').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  import('../../lib/log/logger.js').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});
