/* eslint-disable no-underscore-dangle */
import http from 'http';
import config from 'config';
import { Handler } from '@evershop/evershop/src/lib/middleware/Handler.js';
import spawn from 'cross-spawn';
import path from 'path';
import { error } from '@evershop/evershop/src/lib/log/logger.js';
import isDevelopmentMode from '@evershop/evershop/src/lib/util/isDevelopmentMode.js';
import { lockHooks } from '@evershop/evershop/src/lib/util/hookable.js';
import { lockRegistry } from '@evershop/evershop/src/lib/util/registry.js';
import { validateConfiguration } from '@evershop/evershop/src/lib/util/validateConfiguration.js';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { normalizePort } from './normalizePort.js';
import { onListening } from './onListening.js';
import { onError } from './onError.js';
import { getCoreModules } from './loadModules.js';
import { migrate } from './bootstrap/migrate.js';
import { loadBootstrapScript } from './bootstrap/bootstrap.js';
import { getEnabledExtensions } from '../extension/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app = createApp();
/** Create a http server */
const server = http.createServer(app);

export const start = async function start(cb) {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  /** Loading bootstrap script from modules */
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      await loadBootstrapScript(module);
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
  const args = [
    path.resolve(__dirname, '../../src/lib/event/event-manager.js')
  ];
  if (isDevelopmentMode() || process.argv.includes('--debug')) {
    args.push('--debug');
  }
  const child = spawn('node', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ALLOW_CONFIG_MUTATIONS: true
    }
  });

  child.on('error', (err) => {
    error(`Error spawning event processor: ${err}`);
  });

  child.unref();

  // Spawn the child process to manage scheduled jobs
  const jobArgs = [path.resolve(__dirname, 'cronjob.js')];
  if (isDevelopmentMode() || process.argv.includes('--debug')) {
    jobArgs.push('--debug');
  }
  const jobChild = spawn('node', jobArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ALLOW_CONFIG_MUTATIONS: true
    }
  });
  jobChild.on('error', (err) => {
    error(`Error spawning job processor: ${err}`);
  });
  jobChild.unref();
};

export const updateApp = function updateApp(cb) {
  /** Clean up middleware */
  Handler.middlewares = [];
  const newApp = createApp();
  server.removeListener('request', app);
  server.on('request', newApp);
  app = newApp;
  cb();
};
