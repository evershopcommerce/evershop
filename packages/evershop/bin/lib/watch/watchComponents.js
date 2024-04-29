const chokidar = require('chokidar');
const touch = require('touch');
const { resolve } = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');

function watchComponents() {
  chokidar
    .watch(
      ['./packages/**/*.jsx', './extensions/**/*.jsx', './themes/**/*.jsx'],
      {
        ignored: /node_modules[\\/]/,
        ignoreInitial: true,
        persistent: true
      }
    )
    .on('add', () => {
      touch(
        resolve(
          CONSTANTS.MOLDULESPATH,
          '../components/common/react/client/Index.jsx'
        )
      );
    });
}

module.exports.watchComponents = watchComponents;
