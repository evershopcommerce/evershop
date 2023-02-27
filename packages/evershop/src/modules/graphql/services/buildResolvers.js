const path = require('path');
const { loadFilesSync } = require('@graphql-tools/load-files');
const { mergeResolvers } = require('@graphql-tools/merge');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { getEnabledExtensions } = require('../../../../bin/extension');

module.exports.buildResolvers = function buildResolvers() {
  const typeSources = [
    path.join(CONSTANTS.MOLDULESPATH, '*/graphql/types/**/*.resolvers.js')
  ];
  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    typeSources.push(
      path.join(extension.path, 'graphql', 'types', '**', '*.resolvers.js')
    );
  });
  const resolvers = mergeResolvers(
    typeSources.map((source) => loadFilesSync(source))
  );

  return resolvers;
};
