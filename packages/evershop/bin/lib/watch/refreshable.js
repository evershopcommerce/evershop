import chokidar from 'chokidar';
import { resolve } from 'path';
import { CONSTANTS } from '@evershop/evershop/src/lib/helpers.js';
import { broadcash } from './broadcash.js';

function refreshable() {
  const watcher = chokidar.watch('./packages/evershop/src/lib/response/*', {
    ignored: /node_modules[\\/]/,
    ignoreInitial: true,
    persistent: true
  });
  watcher.add('./packages/evershop/src/lib/util/*');
  watcher.on('all', (event, path) => {
    delete require.cache[require.resolve(resolve(CONSTANTS.ROOTPATH, path))];
    broadcash();
  });
}

module.exports.refreshable = refreshable;
