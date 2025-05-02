import chokidar from 'chokidar';
import { resolve } from 'path';
import { CONSTANTS } from '../../../src/lib/helpers.js';
import { existsSync } from 'fs';
import { getConfig } from '../../../src/lib/util/getConfig.js';

export function watch(calbacks = []) {
  const watcher = chokidar.watch(resolve(CONSTANTS.ROOTPATH, 'extensions/**'), {
    // ignored: /node_modules[\\/]/,
    ignoreInitial: true,
    persistent: true
  });

  if (existsSync(resolve(CONSTANTS.ROOTPATH, 'packages'))) {
    watcher.add(resolve(CONSTANTS.ROOTPATH, 'packages/evershop/src/**'));
  }

  // Watch themes folder
  const theme = getConfig('system.theme');
  if (theme && existsSync(resolve(CONSTANTS.ROOTPATH, 'themes', theme))) {
    watcher.add(resolve(CONSTANTS.ROOTPATH, 'themes', theme, '**'));
  }

  watcher.on('all', (event, path) => {
    calbacks.forEach((callback) => {
      callback(event, path);
    });
  });
}
