const chokidar = require('chokidar');
const { resolve } = require('path');
const { CONSTANTS } = require('../../../src/lib/helpers');
const { Componee } = require('../../../src/lib/componee/Componee');
const { createComponents } = require('../../lib/createComponents');
const { getRoutes } = require('../../../src/lib/router/Router');
const { isBuildRequired } = require('../../../src/lib/webpack/isBuildRequired');

function watchComponents() {
  chokidar.watch('**/**/views/*/components.js', {
    ignored: /node_modules[\\/]/,
    ignoreInitial: true,
    persistent: true
  }).on('all', (event, path) => {
    const modulePath = resolve(CONSTANTS.ROOTPATH, path).split('/views/')[0];
    Componee.updateModuleComponents({
      name: modulePath.split('/').reverse()[0],
      path: modulePath
    });
    const routes = getRoutes();
    createComponents(routes.filter((r) => isBuildRequired(r)), true);
  });
}

module.exports.watchComponents = watchComponents;