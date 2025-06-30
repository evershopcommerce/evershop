import './register.js';
import './initEnvDev.js';
import { debug, error } from '../../lib/log/logger.js';
import { start } from '../lib/startUp.js';
import { compileTs } from './compileTs.js';
import enableWatcher from './enableWatcher.js';

await compileTs();
enableWatcher();
start({
  command: 'dev',
  env: 'development',
  process: 'main'
});

process.on('SIGTERM', async () => {
  debug('Received SIGTERM, shutting down the main process...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown the main process:');
    error(err);
    process.exit(1);
  }
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
