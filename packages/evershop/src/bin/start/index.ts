import './initEnvStart.js';
import { start } from '../lib/startUp.js';

start({
  command: 'start',
  env: 'production',
  process: 'main'
});
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
