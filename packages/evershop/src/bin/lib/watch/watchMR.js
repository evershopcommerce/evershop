import chokidar from 'chokidar';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../../../src/lib/helpers.js';
import { Handler } from '../../../src/lib/middleware/Handler.js';
import { info, error } from '../../../src/lib/log/logger.js';
import { updateApp } from '../startUp.js';
import { broadcash } from './broadcash.js';

export function watchMR() {
  const watcher = chokidar.watch(
    resolve(CONSTANTS.ROOTPATH, 'extensions/*/controllers/**'),
    {
      // ignored: /node_modules[\\/]/,
      ignoreInitial: true,
      persistent: true
    }
  );
  watcher.add(resolve(CONSTANTS.ROOTPATH, 'extensions/*/apiControllers/**'));
  if (existsSync(resolve(CONSTANTS.ROOTPATH, 'packages'))) {
    watcher.add(
      resolve(
        CONSTANTS.ROOTPATH,
        'packages/evershop/src/modules/*/controllers/**'
      )
    );
    watcher.add(
      resolve(
        CONSTANTS.ROOTPATH,
        'packages/evershop/src/modules/*/apiControllers/**'
      )
    );
  }
  watcher.on('change', (path) => {
    info(`Middleware updated ${path}`);

    if (!path.endsWith('.js')) {
      return;
    }
    delete require.cache[require.resolve(resolve(CONSTANTS.ROOTPATH, path))];
    broadcash();
  });

  watcher.on('unlink', (path) => {
    if (!path.endsWith('.js')) {
      return;
    }
    info(`Middleware removed ${path}`);
    Handler.removeMiddleware(resolve(CONSTANTS.ROOTPATH, path));
    broadcash();
  });

  watcher.on('add', (path) => {
    if (!path.endsWith('.js')) {
      return;
    }
    info(`Middleware added ${path}`);
    try {
      Handler.addMiddlewareFromPath(resolve(CONSTANTS.ROOTPATH, path));
      broadcash();
    } catch (e) {
      error(`Hot Reload Error: ${e.message}`);
    }
  });

  /** Implement routing update */
  watcher.on('change', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    info(`Route updated ${path}`);
    updateApp(broadcash);
  });

  watcher.on('unlink', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    info(`Route removed ${path}`);
    broadcash();
  });

  watcher.on('add', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    info(`Route added ${path}`);
    updateApp(broadcash);
  });

  watcher.on('unlinkDir', (path) => {
    info(`Dir removed ${path}`);
    broadcash();
  });

  watcher.on('addDir', (path) => {
    info(`Dir added ${path}`);
    updateApp(broadcash);
  });
}
