const chokidar = require('chokidar');
const { resolve } = require('path');
const { CONSTANTS } = require('../../../src/lib/helpers');
const { broadcash } = require('./broadcash');

function refreshable() {
  const watcher = chokidar.watch('./packages/core/src/lib/response/*', {
    ignored: /node_modules[\\/]/,
    ignoreInitial: true,
    persistent: true
  })
  watcher.add('./packages/core/src/lib/util/*');
  watcher.on('all', (event, path) => {
    console.log(event);
    delete require.cache[require.resolve(resolve(CONSTANTS.ROOTPATH, path))];
    broadcash();
  });
}

module.exports.refreshable = refreshable;