const chokidar = require('chokidar');
const { existsSync } = require('fs');
const { resolve } = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { Handler } = require('@evershop/evershop/src/lib/middleware/Handler');
const { updateApp } = require('../startUp');
const { broadcash } = require('./broadcash');
const { red } = require('kleur');

function watchMR() {
  const watcher = chokidar.watch(
    resolve(CONSTANTS.ROOTPATH, 'extensions/*/controllers/**'),
    {
      //ignored: /node_modules[\\/]/,
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
    console.log('Middleware updated', path);

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
    console.log('Middleware removed', path);
    Handler.removeMiddleware(resolve(CONSTANTS.ROOTPATH, path));
    broadcash();
  });

  watcher.on('add', (path) => {
    if (!path.endsWith('.js')) {
      return;
    }
    console.log('Middleware added', path);
    try {
      Handler.addMiddlewareFromPath(resolve(CONSTANTS.ROOTPATH, path));
      broadcash();
    } catch (e) {
      console.log(red(`Hot Reload Error: ${e.message}`));
    }
  });

  /** Implement routing update*/
  watcher.on('change', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    console.log('Route updated', path);
    updateApp(broadcash);
  });

  watcher.on('unlink', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    console.log('Route removed', path);
    broadcash();
  });

  watcher.on('add', (path) => {
    if (!path.endsWith('route')) {
      return;
    }
    console.log('Route added', path);
    updateApp(broadcash);
  });

  watcher.on('unlinkDir', (path) => {
    console.log('Dir removed', path);
    broadcash();
  });

  watcher.on('addDir', (path) => {
    console.log('Dir added', path);
    updateApp(broadcash);
  });
}

module.exports.watchMR = watchMR;
