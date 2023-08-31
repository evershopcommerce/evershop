const chokidar = require('chokidar');
const { existsSync } = require('fs');
const { resolve } = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { Handler } = require('@evershop/evershop/src/lib/middleware/Handler');
const { info, error } = require('@evershop/evershop/src/lib/log/debuger');
const { updateApp } = require('../startUp');
const { broadcash } = require('./broadcash');

function watchMR() {
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

module.exports.watchMR = watchMR;
