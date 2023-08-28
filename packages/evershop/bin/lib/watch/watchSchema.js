const { normalize, resolve } = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { broadcash } = require('./broadcash');
const { info } = require('console');

module.exports.watchSchema = function (event, path) {
  // Check if path include graphql/types
  if (!path.includes(normalize('graphql/types'))) {
    return;
  }
  if (event === 'change') {
    info(`Updating ${path}`);
    delete require.cache[require.resolve(path)];
  }
  info('cleaning require cache');
  // Delete buildSchema.js cache
  delete require.cache[
    require.resolve(
      resolve(CONSTANTS.MOLDULESPATH, 'graphql/services/buildSchema')
    )
  ];
  require(resolve(CONSTANTS.MOLDULESPATH, 'graphql/services/buildSchema'));
  broadcash();
};
