const chokidar = require('chokidar');
const { resolve } = require('path');
const { CONSTANTS } = require('../../../src/lib/helpers');
const { Componee } = require('../../../src/lib/componee/Componee');
const { createComponents } = require('../../build/createComponents');
const { getRoutes } = require('../../../src/lib/router/routes');

function watchComponents() {
  chokidar.watch('**/**/views/*/components.js', {
    ignored: /node_modules[\\/]/,
    ignoreInitial: true,
    persistent: true
  }).on('all', (event, path) => {
    const modulePath = resolve(CONSTANTS.ROOTPATH, path).split('/views/')[0];
    Componee.updateModuleComponents(modulePath);
    const routes = getRoutes();
    createComponents(routes.filter((r) => (r.isApi === false && !['staticAsset', 'adminStaticAsset'].includes(r.id))));
  });
}

module.exports.watchComponents = watchComponents;