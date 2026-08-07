import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import config from 'config';
import spawn from 'cross-spawn';
import { error, debug } from '../../lib/log/logger.js';
import { Handler } from '../../lib/middleware/Handler.js';
import { lockHooks } from '../../lib/util/hookable.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
import { lockRegistry } from '../../lib/util/registry.js';
import { validateConfiguration } from '../../lib/util/validateConfiguration.js';
import { getEnabledExtensions } from '../extension/index.js';
import { createApp } from './app.js';
import { loadBootstrapScript } from './bootstrap/bootstrap.js';
import { migrate } from './bootstrap/migrate.js';
import { getCoreModules } from './loadModules.js';
import { normalizePort } from './normalizePort.js';
import { onError } from './onError.js';
import { onListening } from './onListening.js';
import { startCronProcess } from './startCronProcess.js';
import { startSubscriberProcess } from './startSubscriberProcess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const start = async function start(context, cb) {
  const app = createApp();
  /** Create a http server */
  const server = http.createServer(app);
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module, context);
    }
    lockHooks();
    lockRegistry();
    // Get the configuration (nodeconfig)
    validateConfiguration(config);
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = false;

  /** Migration */
  try {
    await migrate(modules);
  } catch (e) {
    error(e);
    process.exit(0);
  }

  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort();
  app.set('port', port);

  /** Start listening */
  server.on('listening', () => {
    onListening();
    if (cb) {
      cb();
    }
  });
  server.on('error', onError);
  server.listen(port);

  // Spawn the child process to manage events
  let subscriberChild = startSubscriberProcess(context);
  let jobChild = startCronProcess(context);

  process.on('exit', (code) => {
    // Cleanup child processes on exit
    if (subscriberChild && subscriberChild.pid) {
      subscriberChild.kill('SIGTERM');
    }
    if (jobChild && jobChild.pid) {
      jobChild.kill('SIGTERM');
    }
    if (code === 100) {
      debug('Restarting the sever');
      process.send('RESTART_ME');
    }
  });
  process.on('RESTART_CRONJOB', () => {
    debug('Restarting the cron job process');
    jobChild.kill('SIGTERM');
    jobChild = startCronProcess(context);
  });

  process.on('RESTART_SUBSCRIBER', () => {
    debug('Restarting the subscriber process');
    subscriberChild.kill('SIGTERM');
    subscriberChild = startSubscriberProcess(context);
  });
};
