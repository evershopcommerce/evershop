const path = require('path');
const { loadFilesSync } = require('@graphql-tools/load-files');
const { mergeResolvers } = require('@graphql-tools/merge');
const { CONSTANTS } = require('../../../lib/helpers');
const { getEnabledExtensions } = require('../../../../bin/extension');

const typeSources = [path.join(CONSTANTS.MOLDULESPATH, '*/graphql/types/**/Resovers.js')];
const extensions = getEnabledExtensions();
extensions.forEach((extension) => {
  typeSources.push(path.join(extension.path, 'graphql', 'types', '**', 'Resovers.js'));
});
const resolvers = mergeResolvers(typeSources.map((source) => loadFilesSync(source)));

module.exports = resolvers;